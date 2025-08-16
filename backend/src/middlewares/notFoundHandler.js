// backend/src/middlewares/notFoundHandler.js
module.exports = (req, res, _next) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
};