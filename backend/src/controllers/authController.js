// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const db = require('../models');
const { User, Household } = db;

// Optional category seeding (safe if helper is missing)
let seedCategories = null;
try { ({ seedCategories } = require('../utils/seedCategories')); } catch {}

function signAuthToken(user, expiresIn = '12h') {
  const payload = {
    userId: user.id,
    role: user.role || 'user',
    householdId: user.householdId || null,
  };
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

// POST /auth/register
async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existing = await User.findOne({ where: { email: emailNorm } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const household = await Household.create({ name: `${name}'s household` });
    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      passwordHash,
      role: 'user',
      householdId: household.id,
    });

    if (seedCategories) {
      try { await seedCategories(household.id); }
      catch (e) { logger.warn('Category seed failed after register', { error: e.message }); }
    }

    const token = signAuthToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (err?.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors?.[0]?.message || 'Validation failed' });
    }
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      return res.status(500).json({ error: 'Internal Server Error', detail: err.message, code: err.name });
    }
    logger.error('Register error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST /auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const user = await db.User.findOne({
      where: { email: emailNorm },
      attributes: { include: ['passwordHash'] }
    });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAuthToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET /auth/google/callback
async function handleOAuthCallback(req, res) {
  const token = typeof req.user === 'string' ? req.user : null;
  if (!token) {
    logger.error('OAuth callback missing token');
    return res.status(400).json({ error: 'OAuth login failed' });
  }
  const frontend = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
  if (frontend) return res.redirect(`${frontend}/oauth/callback?token=${encodeURIComponent(token)}`);
  return res.json({ token });
}

// POST /auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });
    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ where: { email: emailNorm } });

    let devToken;
    if (user) {
      try {
        const token = jwt.sign({ sub: user.id, action: 'pwdreset' }, process.env.JWT_SECRET, { expiresIn: process.env.RESET_TOKEN_TTL || '15m' });
        const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
        const resetUrl = base ? `${base}/auth/reset-password/${token}` : null;
        if ((process.env.NODE_ENV || 'development') !== 'production') devToken = { token, resetUrl };
      } catch (e) {
        logger.error('forgot-password token error', e);
      }
    }
    return res.json({ ok: true, message: 'If the email exists, a reset link has been generated.', ...(devToken ? { dev: devToken } : {}) });
  } catch (err) {
    logger.error('Forgot password error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST /auth/reset-password/:token
async function resetPassword(req, res) {
  try {
    const { token } = req.params || {};
    const { password } = req.body || {};
    if (!token) return res.status(400).json({ error: 'reset token missing' });
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
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
  } catch (err) {
    logger.error('Reset password error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  register,
  login,
  handleOAuthCallback,
  forgotPassword,
  resetPassword,
};
