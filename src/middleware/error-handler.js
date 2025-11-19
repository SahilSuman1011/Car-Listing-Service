const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global Error Handler Middleware
 * Catches all errors and sends appropriate responses
 */

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal server error',
    ...(config.server.env === 'development' && {
      stack: err.stack,
      error: err,
    }),
  };

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.url}`);
  error.status = 404;
  next(error);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};