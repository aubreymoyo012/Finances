// backend/src/controllers/receiptController.js
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

let sharp = null;
try {
  // Lazy-require so your app still runs if sharp fails to build in CI
  sharp = require('sharp');
} catch (_) { /* no-op; we’ll fall back to raw image */ }

const receiptService = require('../services/receiptService');

/* ---------------------------- tiny validation ---------------------------- */
function validateReceiptData(body = {}) {
  const errs = [];
  if (body.total != null && !Number.isFinite(Number(body.total))) errs.push('total must be numeric');
  if (body.date && Number.isNaN(Date.parse(body.date))) errs.push('date must be a valid ISO date');
  if (body.store != null && typeof body.store !== 'string') errs.push('store must be a string');
  return errs.length ? errs.join(', ') : null;
}

/* --------------------------- image pre-processing ------------------------ */
/**
 * Returns a path to a pre-processed PNG optimized for OCR.
 * Uses sharp if available; otherwise returns the original path.
 */
async function preprocessForOCR(srcPath) {
  if (!sharp) return srcPath;

  const out = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    const meta = await sharp(srcPath).metadata();

    // Scale to ~1500-2200px wide for better OCR (if smaller)
    const targetWidth = meta.width && meta.width < 1500 ? Math.min(2200, meta.width * 2) : null;

    let img = sharp(srcPath).rotate(); // uses EXIF orientation

    if (targetWidth) img = img.resize({ width: targetWidth, withoutEnlargement: false });

    // Grayscale + normalize contrast + light denoise + adaptive threshold
    img = img
      .grayscale()
      .normalize()               // stretch contrast
      .median(1)                 // light denoise
      .threshold(180, {          // binarize; tweak if needed
        grayscale: true
      });

    await img.png({ compressionLevel: 9 }).toFile(out);
    return out;
  } catch (e) {
    // If preprocess fails, just use the original
    console.warn('OCR preprocess failed; using raw image:', e.message);
    return srcPath;
  }
}

/* ------------------------------ OCR helpers ------------------------------ */
async function recognizeMultiPass(imagePath, langs) {
  const configs = [
    // Pass 1: structured lines (uniform block), keep spaces, allow item chars
    {
      opts: {
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;+-_*/xX$€£()#%'\"&@",
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      },
      weight: 0.6
    },
    // Pass 2: sparse text (helps when receipts are cluttered)
    {
      opts: {
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;+-_*/xX$€£()#%'\"&@",
        tessedit_pageseg_mode: '11', // Sparse text
      },
      weight: 0.4
    }
  ];

  let merged = '';
  for (const pass of configs) {
    try {
      const res = await Tesseract.recognize(imagePath, langs, {
        ...pass.opts,
        logger: process.env.OCR_VERBOSE ? m => console.log('[tesseract]', m) : undefined
      });
      const text = res?.data?.text || '';
      // simple weighted concat (could de-dup lines; good enough)
      merged += (merged ? '\n' : '') + text;
    } catch (e) {
      console.warn('OCR pass failed:', e.message);
    }
  }
  return merged.trim();
}

/* ------------------------------- parsing --------------------------------- */
/**
 * Normalize OCR numbers: fix common confusions O→0, l→1, I→1, S→5, B→8
 */
function fixOCRDigits(s) {
  return s
    .replace(/O/g, '0')
    .replace(/l/g, '1')
    .replace(/I/g, '1')
    .replace(/S(?=\d)/g, '5')       // S followed by digit
    .replace(/(?<=\d)S/g, '5')      // digit followed by S
    .replace(/B(?=\d)/g, '8')
    .replace(/(?<=\d)B/g, '8');
}

/**
 * Parse a money-like string into Number. Accepts 1,234.56 or 1.234,56
 */
function parseMoney(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/[^\d.,-]/g, '');

  // If both separators exist, decide decimal by last occurrence
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      s = s.replace(/,/g, '');            // dot is decimal, remove thousands comma
    } else {
      s = s.replace(/\./g, '').replace(',', '.'); // comma is decimal
    }
  } else {
    // Only one type present → assume dot decimal; strip commas
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Heuristic parser for line items from OCR text.
 * Returns: [{ name, quantity, unitPrice }]
 */
function parseReceiptText(raw = '') {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw
    .split(/\r?\n/)
    .map(s => fixOCRDigits(s).trim().replace(/\s{2,}/g, ' '))
    .filter(Boolean);

  const IGNORE = /^(?:subtotal|total|tax|vat|gst|pst|hst|change|tender|cash|visa|mastercard|debit|balance|thank|invoice|items?)\b/i;

  const items = [];

  for (let line of lines) {
    if (IGNORE.test(line)) continue;

    // Common cleanups
    let s = line
      .replace(/[,$]/g, ',') // unify separators so parseMoney can decide
      .replace(/[×*]/g, 'x');

    // Pattern A: "Bananas 2 x 0.59"
    let m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s|$)/i);
    if (m) {
      const name = m[1].trim();
      const q = parseMoney(m[2]);
      const p = parseMoney(m[3]);
      if (name && Number.isFinite(q) && Number.isFinite(p)) {
        items.push({ name, quantity: q, unitPrice: p });
        continue;
      }
    }

    // Pattern B: "2 Apples 1.29"
    m = s.match(/^(\d+(?:[.,]\d+)?)\s+(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (m) {
      const q = parseMoney(m[1]);
      const name = m[2].trim();
      const p = parseMoney(m[3]);
      if (name && Number.isFinite(q) && Number.isFinite(p)) {
        items.push({ name, quantity: q, unitPrice: p });
        continue;
      }
    }

    // Pattern C: "Milk 2.99"   (assume quantity 1)
    m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (m) {
      const name = m[1].trim();
      const p = parseMoney(m[2]);
      if (name && Number.isFinite(p)) {
        items.push({ name, quantity: 1, unitPrice: p });
        continue;
      }
    }
  }

  // de-dupe obvious junk and clamp
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = `${it.name}|${it.quantity}|${it.unitPrice}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out.slice(0, 128);
}

/* ------------------------------- upload ---------------------------------- */
exports.upload = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image file is required' });

    const validationError = validateReceiptData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    // Build a public /uploads path from Win/Linux file paths
    const rel = req.file.path.replace(/.*[\\/]uploads[\\/]/, '');
    const imageUrl = `/uploads/${rel.replace(/\\/g, '/')}`;

    // Pre-process → OCR (multipass) → parse
    const langs = process.env.TESSERACT_LANGS || 'eng';
    const prepped = await preprocessForOCR(req.file.path);

    let text = '';
    try {
      text = await recognizeMultiPass(prepped, langs);
    } catch (ocrErr) {
      console.error('OCR failed; continuing with empty items:', ocrErr);
    } finally {
      if (prepped !== req.file.path) {
        fs.unlink(prepped).catch(() => {});
      }
    }

    const items = parseReceiptText(text);

    const receipt = await receiptService.uploadReceipt({
      userId,
      store: req.body.store,
      total: req.body.total != null ? parseFloat(req.body.total) : null,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      imageUrl,
      items
    });

    res.status(201).json({
      receiptId: receipt.id,
      parsedItems: items,
      imageUrl: receipt.imageUrl || imageUrl
    });
  } catch (error) {
    console.error('Receipt processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process receipt' });
  }
};

/* expose parser for unit tests / re-use */
exports.parseReceiptText = parseReceiptText;
