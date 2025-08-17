// backend/src/routes/users.js
const express = require('express');
const { body, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const isAuth = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');
const logger = require('../utils/logger');
const db = require('../models');
const { User } = db;

const router = express.Router();

const sanitizeUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  householdId: u.householdId,
  preferredCurrency: u.preferredCurrency,
  timezone: u.timezone,
  profilePicture: u.profilePicture,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// NOTE: paths are relative because this router is mounted at /api/v1/users

// GET /api/v1/users/me
router.get('/me', isAuth(), asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
}));

// PATCH /api/v1/users/me
router.patch(
  '/me',
  isAuth(),
  [
    body('name').optional().isString().trim().isLength({ min: 2, max: 50 }),
    body('preferredCurrency').optional().isString().isLength({ min: 3, max: 3 }).toUpperCase(),
    body('timezone').optional().isString().isLength({ min: 1, max: 100 }),
    body('profilePicture').optional().isURL(),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, preferredCurrency, timezone, profilePicture } = req.body;
    await user.update({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(preferredCurrency !== undefined ? { preferredCurrency } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(profilePicture !== undefined ? { profilePicture } : {}),
    });

    res.json(sanitizeUser(user));
  })
);

// POST /api/v1/users/change-password
router.post(
  '/change-password',
  isAuth(),
  [
    body('newPassword').isString().isLength({ min: 8, max: 128 }),
    body('currentPassword').optional().isString(),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.passwordHash) {
      if (!currentPassword) return res.status(400).json({ error: 'currentPassword is required' });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash });
    logger.info('Password changed', { userId: user.id });
    res.json({ ok: true });
  })
);

// GET /api/v1/users  (admin)
router.get(
  '/',
  isAuth('admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: { exclude: ['passwordHash', 'verificationToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    res.json({ page, limit, total: count, data: rows.map(sanitizeUser) });
  })
);

// GET /api/v1/users/:id (self or admin)
router.get(
  '/:id',
  isAuth(),
  [param('id').isUUID(), validateRequest],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isSelf = req.user.userId === id;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
  })
);

// DELETE /api/v1/users/:id (admin)
router.delete(
  '/:id',
  isAuth('admin'),
  [param('id').isUUID(), validateRequest],
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.destroy();
    res.status(204).send();
  })
);

module.exports = router;
