// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.replace('Bearer ', '');
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await require('../models').User.findByPk(payload.userId);
      if (!req.user) return res.sendStatus(401);

      if (requiredRole && req.user.role !== requiredRole) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
};
