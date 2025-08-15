const express = require('express');
const { body } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const transactionValidation = [
  body('amount').isDecimal().withMessage('Amount must be a number').toFloat(),
  body('type').isIn(['income','expense']).withMessage('Type must be either income or expense'),
  body('date').optional().isISO8601().withMessage('Invalid date format').toDate(),
  body('categoryId').isUUID().withMessage('Invalid category ID'),
  body('description').optional().trim().escape(),
  validateRequest
];

router.get('/', isAuth(), asyncHandler(transactionController.list));
router.post('/', isAuth(), transactionValidation, asyncHandler(transactionController.create));
router.put('/:id', isAuth(), transactionValidation, asyncHandler(transactionController.update));
router.delete('/:id', isAuth(), asyncHandler(transactionController.delete));

module.exports = router;
