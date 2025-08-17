// backend/src/middlewares/errorHandler.js
module.exports = (err, req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;

  // Always log full error server-side
  // eslint-disable-next-line no-console
  console.error(err);

  if (isProd) {
    return res.status(status).json({ error: 'Internal Server Error' });
  }

  return res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.name,
    stack: err.stack
  });
};
