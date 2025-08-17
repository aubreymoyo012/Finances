// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = function isAuth(requiredRole) {
  return (req, res, next) => {
    try {
      const auth = req.headers.authorization || req.headers.Authorization || '';
      const m = /^\s*Bearer\s+(.+)\s*$/i.exec(auth);
      const token = m && m[1];

      if (!token) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // decoded is what you signed in authController: { userId, role, householdId, iat, exp }
      req.user = decoded;

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};
