const { body } = require('express-validator');
const validateRequest = require('../middlewares/validateRequest');
const router = require('express').Router();
const categoryController = require('../controllers/categoryController');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const createValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 50 }).withMessage('Name max 50 chars')
    .escape(),
  validateRequest
];

router.get('/', isAuth(), asyncHandler(categoryController.list));
router.post('/', isAuth('admin'), createValidation, asyncHandler(categoryController.create));

module.exports = router;
