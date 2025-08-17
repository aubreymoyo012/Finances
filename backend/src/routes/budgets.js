// src/routes/budget.js
const express = require('express');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const budgetController = require('../controllers/budgetController');

const router = express.Router();

// Allow normal users (not admin-only) as discussed.
router.get('/', isAuth(), asyncHandler(budgetController.list));
router.post('/', isAuth(), asyncHandler(budgetController.create));

module.exports = router;
