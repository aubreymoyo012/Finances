/**
 * Base Error class for custom errors
 */
class BaseError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.details = details;
    this.isOperational = true; // Distinguish operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for API response
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * Error for resource not found (404)
 */
class NotFoundError extends BaseError {
  constructor(resource, id, message = 'Not Found') {
    const details = {};
    if (resource) details.resource = resource;
    if (id) details.id = id;
    
    super(
      message || `${resource || 'Resource'}${id ? ` with ID ${id}` : ''} not found`,
      404,
      Object.keys(details).length ? details : undefined
    );
  }
}

/**
 * Error for invalid input (400)
 */
class InvalidInputError extends BaseError {
  constructor(field, message = 'Invalid Input', validationErrors) {
    const details = {};
    if (field) details.field = field;
    if (validationErrors) details.errors = validationErrors;
    
    super(
      message || (field ? `Invalid value for ${field}` : 'Invalid input provided'),
      400,
      Object.keys(details).length ? details : undefined
    );
  }
}

/**
 * Error for authentication failures (401)
 */
class AuthenticationError extends BaseError {
  constructor(message = 'Authentication Failed') {
    super(message, 401);
  }
}

/**
 * Error for unauthorized access (403)
 */
class AuthorizationError extends BaseError {
  constructor(message = 'Forbidden', requiredPermissions) {
    super(
      message,
      403,
      requiredPermissions ? { required: requiredPermissions } : undefined
    );
  }
}

/**
 * Error for conflict situations (409)
 */
class ConflictError extends BaseError {
  constructor(resource, message = 'Conflict') {
    super(
      message || `${resource || 'Resource'} already exists`,
      409,
      resource ? { resource } : undefined
    );
  }
}

module.exports = {
  BaseError,
  NotFoundError,
  InvalidInputError,
  AuthenticationError,
  AuthorizationError,
  ConflictError
};