/**
 * Wraps async route handlers to automatically catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped middleware function
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    // Log request details for debugging
    const requestInfo = {
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      body: Object.keys(req.body).length > 0 ? req.body : undefined
    };

    // Execute the async function and handle errors
    Promise.resolve(fn(req, res, next))
      .catch((error) => {
        // Log the error with request context
        console.error('Async handler error:', {
          error: error.message,
          stack: error.stack,
          request: requestInfo,
          timestamp: new Date().toISOString()
        });

        // Handle specific error types differently
        if (error.name === 'ValidationError') {
          return res.status(400).json({
            error: 'Validation Error',
            details: error.errors || error.message
          });
        }

        if (error.name === 'NotFoundError') {
          return res.status(404).json({
            error: error.message || 'Resource not found'
          });
        }

        if (error.name === 'AuthenticationError') {
          return res.status(401).json({
            error: error.message || 'Authentication failed'
          });
        }

        // Default error handling
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? 
            error.message : 'Something went wrong'
        });

        // Pass to express error handler if needed
        if (!res.headersSent) {
          next(error);
        }
      });
  };
}

module.exports = asyncHandler;