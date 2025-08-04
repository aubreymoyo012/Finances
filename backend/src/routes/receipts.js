// backend/src/routes/receipts.js
const express = require('express');
const router = express.Router();

const { body } = require('express-validator');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');

const receiptController = require('../controllers/receiptController');
const upload = require('../utils/multer');

const receiptValidation = [
  body('store').optional().trim().escape(),
  body('total').optional()
    .isDecimal().withMessage('Total must be numeric')
    .toDecimal(),
  body('date').optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate(),
  validateRequest
];

router.get('/', isAuth(), asyncHandler(receiptController.list));

router.post(
  '/upload',
  isAuth(),
  upload.single('receipt'),
  receiptValidation,
  asyncHandler(receiptController.upload)
);

module.exports = router;

