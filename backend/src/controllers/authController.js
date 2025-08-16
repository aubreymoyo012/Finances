// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const db = require('../models');
const { User, Household } = db;

// Optional seeding (won't crash if file isn't present)
let seedCategories = null;
try {
  ({ seedCategories } = require('../utils/seedCategories'));
} catch (_) {
  // seeding is optional; ignore if helper not present
}

function signAuthToken(user, expiresIn = '12h') {
  const payload = {
    userId: user.id,
    role: user.role || 'member',
    householdId: user.householdId || null,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function signResetToken(userId, expiresIn = '15m') {
  const payload = { sub: userId, action: 'pwdreset' };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    householdId: u.householdId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * POST /auth/register
 * body: { name, email, password }
 */
exports.register = async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const existing = await User.findOne({ where: { email: emailNorm } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create a household and the user
  const household = await Household.create({ name: `${name}'s household` });
  const user = await User.create({
    name: String(name).trim(),
    email: emailNorm,
    passwordHash,
    role: 'member',
    householdId: household.id,
  });

  // Seed default categories for this household (if helper is available)
  if (seedCategories) {
    try { await seedCategories(household.id); }
    catch (e) { logger.warn('Category seed failed after register', { error: e.message }); }
  }

  const token = signAuthToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
};

/**
 * POST /auth/login
 * body: { email, password }
 */
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ where: { email: emailNorm } });
  if (!user || !user.passwordHash) {
    // Avoid user enumeration
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAuthToken(user);
  return res.json({ token, user: sanitizeUser(user) });
};

/**
 * GET /auth/google/callback
 * Passport strategy sets req.user to our signed token (see passport.js)
 * If FRONTEND_URL is set, redirect to its callback; else return JSON.
 */
exports.handleOAuthCallback = async (req, res) => {
  const token = typeof req.user === 'string' ? req.user : null;
  if (!token) {
    logger.error('OAuth callback missing token');
    return res.status(400).json({ error: 'OAuth login failed' });
  }

  const frontend = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  if (frontend) {
    const url = `${frontend}/oauth/callback?token=${encodeURIComponent(token)}`;
    return res.redirect(url);
  }
  return res.json({ token });
};

/**
 * POST /auth/forgot-password
 * body: { email }
 * Stateless reset link using a short-lived JWT (no extra DB columns required).
 */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ where: { email: emailNorm } });

  // Always return 200 to avoid enumeration; include token in dev to help testing
  let devToken;
  if (user) {
    try {
      const token = signResetToken(user.id, process.env.RESET_TOKEN_TTL || '15m');
      const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
      const resetUrl = base ? `${base}/auth/reset-password/${token}` : null;

      // In production, you would email resetUrl to the user.
      if ((process.env.NODE_ENV || 'development') !== 'production') {
        devToken = { token, resetUrl };
      }
    } catch (e) {
      logger.error('forgot-password token error', e);
    }
  }

  return res.json({
    ok: true,
    message: 'If the email exists, a reset link has been generated.',
    ...(devToken ? { dev: devToken } : {})
  });
};

/**
 * POST /auth/reset-password/:token
 * body: { password }
 * Verifies the stateless reset token and updates the password hash.
 */
exports.resetPassword = async (req, res) => {
  const { token } = req.params || {};
  const { password } = req.body || {};
  if (!token) return res.status(400).json({ error: 'reset token missing' });
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(400).json({ error: 'invalid or expired reset token' });
  }

  if (decoded.action !== 'pwdreset' || !decoded.sub) {
    return res.status(400).json({ error: 'invalid reset token' });
  }

  const user = await User.findByPk(decoded.sub);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const passwordHash = await bcrypt.hash(password, 10);
  await user.update({ passwordHash });

  logger.info('Password reset successful', { userId: user.id });
  return res.json({ ok: true });
};
