// backend/src/controllers/receiptController.js
const path = require('path');
const tesseract = require('tesseract.js');
const receiptService = require('../services/receiptService');
const uploadReceiptFile = require('../utils/multer');
const { validateReceiptData } = require('../validators/receiptValidator');

exports.list = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const receipts = await receiptService.listReceipts(req.user.id);
    res.json(receipts);
  } catch (error) {
    console.error('Error listing receipts:', error);
    res.status(500).json({ error: 'Failed to retrieve receipts' });
  }
};

exports.upload = async (req, res) => {
  try {
    // Validate user and input
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Process file upload
    await new Promise((resolve, reject) => {
      uploadReceiptFile(req, res, (err) => {
        if (err) {
          console.error('File upload error:', err);
          reject(new Error('File upload failed'));
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image file is required' });
    }

    // Validate receipt data
    const validationError = validateReceiptData(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Perform OCR with cleanup
    let worker;
    try {
      worker = await tesseract.createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(req.file.path);
      
      // Improved receipt parsing
      const items = this.parseReceiptText(text);
      
      const receipt = await receiptService.uploadReceipt({
        userId: req.user.id,
        store: req.body.store,
        total: parseFloat(req.body.total),
        date: new Date(req.body.date),
        imageUrl: `/uploads/${req.file.filename}`,
        items
      });

      res.status(201).json({
        receiptId: receipt.id,
        parsedItems: items,
        imageUrl: receipt.imageUrl
      });
    } finally {
      if (worker) {
        await worker.terminate().catch(err => console.error('Worker cleanup error:', err));
      }
    }
  } catch (error) {
    console.error('Receipt processing error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process receipt' 
    });
  }
};

// Helper method for parsing receipt text
exports.parseReceiptText = (text) => {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Skip empty lines and common non-item lines
      if (!line) return false;
      if (/total|subtotal|tax|change|payment|card|cash/i.test(line)) return false;
      if (/^\d+\.\d{2}$/.test(line)) return false; // Price-only lines
      return /^[\w\d]/.test(line); // Starts with alphanumeric
    })
    .map(line => ({
      name: line.replace(/\s\s+/g, ' '), // Clean extra spaces
      quantity: 1,
      price: this.extractPriceFromLine(line) // Optional: Add price extraction
    }));
};

// Optional: Add price extraction logic
exports.extractPriceFromLine = (line) => {
  const priceMatch = line.match(/\d+\.\d{2}$/);
  return priceMatch ? parseFloat(priceMatch[0]) : null;
};