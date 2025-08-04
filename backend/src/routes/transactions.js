const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController.js');
const isAuth = require('../middlewares/auth.js');
const asyncHandler = require('../utils/asyncHandler.js');

const transactionValidation = [
  body('amount')
    .isDecimal().withMessage('Amount must be a number')
    .toDecimal(),               // Cast string to number

  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),

  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .toDate(),

  body('categoryId')
    .isUUID().withMessage('Invalid category ID'),

  body('description')
    .optional()
    .trim()
    .escape(),

  validateRequest
];

router.get('/', isAuth(), asyncHandler(transactionController.list));
router.post('/', isAuth(), asyncHandler(transactionController.create));

module.exports = router;
