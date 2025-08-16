// backend/src/routes/auth.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const isAuth = require('../middlewares/auth'); // correct import
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests from this IP, please try again later'
});

router.post('/auth/register', authLimiter, asyncHandler(authController.register));
router.post('/auth/login', authLimiter, asyncHandler(authController.login));

router.get('/auth/google',
  passport.authenticate('google', { scope: ['email','profile'], session: false, prompt: 'select_account' })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  authController.handleOAuthCallback
);

router.post('/auth/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
router.post('/auth/reset-password/:token', authLimiter, asyncHandler(authController.resetPassword));

module.exports = router;
