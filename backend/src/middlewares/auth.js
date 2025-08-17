// backend/src/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = function isAuth(requiredRole) {
  return (req, res, next) => {
    try {
      const auth = req.headers.authorization || req.headers.Authorization || '';
      const m = /^\s*Bearer\s+(.+)\s*$/i.exec(auth);
      const token = m && m[1];
      if (!token) return res.status(401).json({ message: 'Invalid token' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { userId, role, householdId, iat, exp }

      if (requiredRole) {
        const ok = Array.isArray(requiredRole)
          ? requiredRole.includes(decoded.role)
          : decoded.role === requiredRole;
        if (!ok) return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};
