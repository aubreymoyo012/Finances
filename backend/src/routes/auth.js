const express = require('express');
const passport = require('passport');
const transactionController = require('../controllers/transactionController');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validateTransaction } = require('../validators/transactionValidator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Transaction routes
router.post('/transactions',
  isAuthenticated,
  validateTransaction,
  asyncHandler(transactionController.create)
);

router.get('/transactions',
  isAuthenticated,
  asyncHandler(transactionController.list)
);

// Authentication routes
router.post('/auth/register',
  authLimiter,
  asyncHandler(authController.register)
);

router.post('/auth/login',
  authLimiter,
  asyncHandler(authController.login)
);

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false,
    prompt: 'select_account' // Forces account selection
  })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
  }),
  authController.handleOAuthCallback
);

// Password reset routes
router.post('/auth/forgot-password',
  authLimiter,
  asyncHandler(authController.forgotPassword)
);

router.post('/auth/reset-password/:token',
  authLimiter,
  asyncHandler(authController.resetPassword)
);

module.exports = router;