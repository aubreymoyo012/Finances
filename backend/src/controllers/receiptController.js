// backend/src/controllers/receiptController.js
const tesseract = require('tesseract.js');
const receiptService = require('../services/receiptService');

// Minimal inline validation to replace missing ../validators/receiptValidator
function validateReceiptData(body = {}) {
  const errs = [];
  if (body.total != null && !Number.isFinite(Number(body.total))) errs.push('total must be numeric');
  if (body.date && Number.isNaN(Date.parse(body.date))) errs.push('date must be a valid ISO date');
  if (body.store != null && typeof body.store !== 'string') errs.push('store must be a string');
  return errs.length ? errs.join(', ') : null;
}

exports.upload = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image file is required' });

    const validationError = validateReceiptData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    let worker;
    try {
      worker = await tesseract.createWorker();
      await worker.load(); // required before loadLanguage / initialize
      const langs = process.env.TESSERACT_LANGS || 'eng';
      await worker.loadLanguage(langs);
      await worker.initialize(langs);

      const { data: { text } } = await worker.recognize(req.file.path);
      const items = exports.parseReceiptText ? exports.parseReceiptText(text) : [];

      const receipt = await receiptService.uploadReceipt({
        userId,
        store: req.body.store,
        total: req.body.total != null ? parseFloat(req.body.total) : null,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        imageUrl: req.file.path.replace(/^.*\/uploads/, '/uploads'),
        items
      });

      res.status(201).json({
        receiptId: receipt.id,
        parsedItems: items,
        imageUrl: receipt.imageUrl
      });
    } finally {
      if (worker) await worker.terminate().catch(() => {});
    }
  } catch (error) {
    console.error('Receipt processing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process receipt' });
  }
};
