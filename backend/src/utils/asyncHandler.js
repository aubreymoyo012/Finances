// backend/src/utils/asyncHandler.js
// Dead-simple wrapper: runs fn and forwards any sync/async error to next().
module.exports = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res, next);
    if (out && typeof out.then === 'function') out.catch(next);
  } catch (err) {
    next(err);
  }
};
