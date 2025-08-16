// backend/src/routes/receipts.js
const express = require('express');
const { body } = require('express-validator');

const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');
const uploadReceipt = require('../utils/multer'); // exports a ready-to-use middleware
const receiptController = require('../controllers/receiptController');

const router = express.Router();

const receiptValidation = [
  body('store').optional().trim().isLength({ max: 120 }),
  body('total').optional().isDecimal().toFloat(),
  body('date').optional().isISO8601().toDate(),
  validateRequest
];

router.get('/', isAuth(), asyncHandler(receiptController.list));
router.post(
  '/upload',
  isAuth(),
  uploadReceipt,        // expects a single file field per your multer setup
  receiptValidation,
  asyncHandler(receiptController.upload)
);

router.get('/:id', isAuth(), asyncHandler(receiptController.getById));
router.delete('/:id', isAuth(), asyncHandler(receiptController.remove));

module.exports = router;
