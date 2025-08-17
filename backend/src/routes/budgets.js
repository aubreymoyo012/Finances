// src/routes/budget.js
const router = require('express').Router();
const budgetController = require('../controllers/budgetController');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const { body } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest'); // wraps validationResult()

// validation for POST /api/budgets
const createBudgetValidation = [
  body('categoryId')
    .exists().withMessage('categoryId is required')
    .bail()
    .isUUID().withMessage('categoryId must be a UUID'),
  body('amount')
    .exists().withMessage('amount is required')
    .bail()
    .isDecimal({ decimal_digits: '0,2' })
      .withMessage('amount must be a decimal number')
    .customSanitizer(val => parseFloat(val)),
  body('period')
    .exists().withMessage('period is required')
    .bail()
    .isString()
    .isIn(['monthly', 'weekly', 'yearly'])
      .withMessage('period must be one of "monthly", "weekly", or "yearly"'),
  validateRequest,
];

router.get('/', isAuth(), asyncHandler(budgetController.list));
// anyone can make a budget now
router.post('/', isAuth(), createBudgetValidation, asyncHandler(budgetController.create));

// optional later: PUT /:id and DELETE /:id routes with isAuth('admin') and validate id param

module.exports = router;
