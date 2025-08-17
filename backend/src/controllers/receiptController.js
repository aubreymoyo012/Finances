// backend/src/controllers/receiptControllers.js
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {} // optional

const receiptService = require('../services/receiptService');

/* ---------- force local language/core (no network) ---------- */
const LANGS = process.env.TESSERACT_LANGS || 'eng';
let LANG_PATH = process.env.TESSERACT_LANG_PATH;
try {
  const engPath = require.resolve('@tesseract.js/language-eng/eng.traineddata.gz');
  LANG_PATH = LANG_PATH || path.dirname(engPath);
} catch (_) {}
let CORE_PATH; try { CORE_PATH = require.resolve('tesseract.js-core/tesseract-core.wasm.js'); } catch (_) {}
let WORKER_PATH; try { WORKER_PATH = require.resolve('tesseract.js/dist/worker.min.js'); } catch (_) {}

const OCR_MAX_MS = Number(process.env.OCR_MAX_MS) || 12000; // hard cap (ms)

/* --------------------------- validation --------------------------- */
function validateReceiptData(body = {}) {
  const errs = [];
  if (body.total != null && !Number.isFinite(Number(body.total))) errs.push('total must be numeric');
  if (body.date && Number.isNaN(Date.parse(body.date))) errs.push('date must be a valid ISO date');
  if (body.store != null && typeof body.store !== 'string') errs.push('store must be a string');
  return errs.length ? errs.join(', ') : null;
}

/* ---------------------- image preprocessing ---------------------- */
async function preprocessForOCR(srcPath) {
  if (!sharp) return srcPath;
  const out = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  try {
    const meta = await sharp(srcPath).metadata();
    const targetWidth = meta.width && meta.width < 1600 ? Math.min(2200, meta.width * 2) : null;

    let img = sharp(srcPath).rotate(); // EXIF orientation
    if (targetWidth) img = img.resize({ width: targetWidth, withoutEnlargement: false });

    img = img.grayscale().normalize().median(1).threshold(180, { grayscale: true });
    await img.png({ compressionLevel: 9 }).toFile(out);
    return out;
  } catch (e) {
    console.warn('[OCR] preprocess failed; using raw image:', e.message);
    return srcPath;
  }
}

/* ---------------------------- OCR passes ------------------------- */
async function recognizeMultiPass(imagePath, langs) {
  console.log('[OCR] starting multipass on', path.basename(imagePath));
  const passes = [
    { tessedit_pageseg_mode: 6 },   // single uniform block
    { tessedit_pageseg_mode: 11 },  // sparse text
  ];
  let merged = '';
  for (const p of passes) {
    console.log('[OCR] pass PSM', p.tessedit_pageseg_mode);
    const res = await Tesseract.recognize(imagePath, langs, {
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;+-_*/xX$€£()#%'\"&@",
      ...p,
      ...(LANG_PATH ? { langPath: LANG_PATH } : {}),
      ...(CORE_PATH ? { corePath: CORE_PATH } : {}),
      ...(WORKER_PATH ? { workerPath: WORKER_PATH } : {}),
      logger: process.env.OCR_VERBOSE ? m => console.log('[tesseract]', m) : undefined
    });
    merged += (merged ? '\n' : '') + (res?.data?.text || '');
  }
  console.log('[OCR] multipass done, chars:', merged.length);
  return merged.trim();
}

/* ------------------------------ helpers -------------------------- */
function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) resolve(null); }, ms);
    promise.then(v => { done = true; clearTimeout(t); resolve(v); })
           .catch(_ => { done = true; clearTimeout(t); resolve(null); });
  });
}

function fixOCRDigits(s) {
  return s
    .replace(/O/g, '0')
    .replace(/l/g, '1')
    .replace(/I/g, '1')
    .replace(/S(?=\d)/g, '5')
    .replace(/(?<=\d)S/g, '5')
    .replace(/B(?=\d)/g, '8')
    .replace(/(?<=\d)B/g, '8');
}

function parseMoney(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/[^\d.,-]/g, '');
  const d = s.lastIndexOf('.'), c = s.lastIndexOf(',');
  if (d !== -1 && c !== -1) {
    if (d > c) s = s.replace(/,/g, '');
    else s = s.replace(/\./g, '').replace(',', '.');
  } else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* ------------------------------ parser --------------------------- */
function parseReceiptText(raw = '') {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.split(/\r?\n/).map(s => fixOCRDigits(s).trim().replace(/\s{2,}/g, ' ')).filter(Boolean);
  const IGNORE = /^(?:subtotal|total|tax|vat|gst|pst|hst|change|tender|cash|visa|mastercard|debit|balance|thank|invoice|items?)\b/i;

  const items = [];
  for (let line of lines) {
    if (IGNORE.test(line)) continue;
    const s = line.replace(/[,$]/g, ',').replace(/[×*]/g, 'x');

    // A) "Bananas 2 x 0.59"
    let m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s|$)/i);
    if (m) {
      const name = m[1].trim(), q = parseMoney(m[2]), p = parseMoney(m[3]);
      if (name && Number.isFinite(q) && Number.isFinite(p)) { items.push({ name, quantity: q, unitPrice: p }); continue; }
    }

    // B) "2 Apples 1.29"
    m = s.match(/^(\d+(?:[.,]\d+)?)\s+(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (m) {
      const q = parseMoney(m[1]), name = m[2].trim(), p = parseMoney(m[3]);
      if (name && Number.isFinite(q) && Number.isFinite(p)) { items.push({ name, quantity: q, unitPrice: p }); continue; }
    }

    // C) "Milk 2.99" (assume qty 1)
    m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/);
    if (m) {
      const name = m[1].trim(), p = parseMoney(m[2]);
      if (name && Number.isFinite(p)) { items.push({ name, quantity: 1, unitPrice: p }); continue; }
    }
  }

  const seen = new Set(); const out = [];
  for (const it of items) {
    const key = `${it.name}|${it.quantity}|${it.unitPrice}`;
    if (!seen.has(key)) { seen.add(key); out.push(it); }
  }
  return out.slice(0, 128);
}

/* --------------------------- controllers ------------------------- */
exports.ocrDryRun = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image file is required' });

    const prepped = await preprocessForOCR(req.file.path);
    const started = Date.now();
    const result = await withTimeout(recognizeMultiPass(prepped, LANGS), OCR_MAX_MS);
    const elapsedMs = Date.now() - started;
    if (prepped !== req.file.path) fs.unlink(prepped).catch(() => {});
    const text = typeof result === 'string' ? result : '';
    const items = parseReceiptText(text);

    return res.json({ elapsedMs, items, text: text.slice(0, 2000) }); // cap raw text for safety
  } catch (e) {
    return res.status(500).json({ error: e.message || 'OCR failed' });
  }
};

exports.upload = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image file is required' });

    const validationError = validateReceiptData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const rel = req.file.path.replace(/.*[\\/]uploads[\\/]/, '');
    const imageUrl = `/uploads/${rel.replace(/\\/g, '/')}`;

    const prepped = await preprocessForOCR(req.file.path);
    const result = await withTimeout(recognizeMultiPass(prepped, LANGS), OCR_MAX_MS);
    if (prepped !== req.file.path) fs.unlink(prepped).catch(() => {});

    const text = typeof result === 'string' ? result : '';
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

exports.parseReceiptText = parseReceiptText;