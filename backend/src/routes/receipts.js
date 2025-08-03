// backend/src/routes/receipts.js
const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', isAuth(), asyncHandler(receiptController.list));
router.post('/upload', isAuth(), asyncHandler(receiptController.upload));

module.exports = router;
