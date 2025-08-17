// backend/src/routes/auth.js
const express = require('express');
let passport;
try {
  // If passport isn't installed/configured yet, we'll still provide a safe no-op handler
  passport = require('passport');
} catch {
  passport = null;
}
const rateLimit = require('express-rate-limit');

let authController;
try {
  authController = require('../controllers/authController');
} catch {
  authController = {};
}

const router = express.Router();

// Local async wrapper (avoids depending on ../utils/asyncHandler)
const aw = (fn) => {
  const handler = (typeof fn === 'function')
    ? fn
    : (_req, res) => res.status(500).json({ error: 'Auth handler not implemented' });
  return async (req, res, next) => {
    try { await handler(req, res, next); } catch (e) { next(e); }
  };
};

// Safe wrapper for passport.authenticate so we always pass a function to router.get()
const authn = (strategy, options) => {
  if (passport && typeof passport.authenticate === 'function') {
    return passport.authenticate(strategy, options);
  }
  // Fallback middleware if passport is missing/misconfigured
  return (_req, res) => res.status(500).json({ error: `Auth strategy '${strategy}' unavailable` });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests from this IP, please try again later'
});

// --- Email/password ---
router.post('/auth/register', authLimiter, aw(authController.register));
router.post('/auth/login',    authLimiter, aw(authController.login));

// --- Google OAuth ---
router.get(
  '/auth/google',
  authn('google', { scope: ['email', 'profile'], session: false, prompt: 'select_account' })
);

// Fallback callback handler if controller method is missing
const oauthCb = (typeof authController.handleOAuthCallback === 'function')
  ? authController.handleOAuthCallback
  : (req, res) => {
      const token = typeof req.user === 'string' ? req.user : null;
      if (!token) return res.status(400).json({ error: 'OAuth login failed' });
      const frontend = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      if (frontend) return res.redirect(`${frontend}/oauth/callback?token=${encodeURIComponent(token)}`);
      return res.json({ token });
    };

router.get(
  '/auth/google/callback',
  authn('google', { failureRedirect: '/login', session: false }),
  oauthCb
);

// --- Password reset (stateless JWT flow) ---
router.post('/auth/forgot-password',       authLimiter, aw(authController.forgotPassword));
router.post('/auth/reset-password/:token', authLimiter, aw(authController.resetPassword));

module.exports = router;
