const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', isAuth(), asyncHandler(transactionController.list));
router.post('/', isAuth(), asyncHandler(transactionController.create));

module.exports = router;
