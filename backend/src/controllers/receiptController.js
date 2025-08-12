// backend/src/controllers/receiptController.js (only the upload handler)
const tesseract = require('tesseract.js');
const receiptService = require('../services/receiptService');
const { validateReceiptData } = require('../validators/receiptValidator');

exports.upload = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (!req.file) return res.status(400).json({ error: 'Receipt image file is required' });

    const validationError = validateReceiptData(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    let worker;
    try {
      worker = await tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      const { data: { text } } = await worker.recognize(req.file.path);
      const items = exports.parseReceiptText(text);

      const receipt = await receiptService.uploadReceipt({
        userId: req.user.id,
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