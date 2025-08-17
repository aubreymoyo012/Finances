// backend/src/routes/receipts.js
const express = require('express');
const { body } = require('express-validator');

const isAuth = require('../middlewares/auth');         // NOTE: ../ not ./
const asyncHandler = require('../utils/asyncHandler'); // NOTE: ../ not ./
const validateRequest = require('../middlewares/validateRequest');
const uploadReceipt = require('../utils/multer');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

router.get('/ping', (_req, res) => res.json({ ok: true })); // health check

router.post('/ocr-dry-run', isAuth(), uploadReceipt, asyncHandler(receiptController.ocrDryRun));

router.post('/echo', isAuth(), uploadReceipt, (req, res) => {
  res.json({
    gotFile: !!req.file,
    size: req.file?.size || null,
    mime: req.file?.mimetype || null,
    filename: req.file?.originalname || null
  });
});


const receiptValidation = [
  body('store').optional().trim().isLength({ max: 120 }),
  body('total').optional().isDecimal().toFloat(),
  body('date').optional().isISO8601().toDate(),
  validateRequest
];

router.post('/upload', isAuth(), uploadReceipt, receiptValidation, asyncHandler(receiptController.upload));

module.exports = router;