/**
 * Centralized Error Handler Utility
 * 
 * Provides consistent error handling across the application with proper logging
 * and standardized response formats.
 * 
 * @author Brian Meyer
 * @version 1.0.0
 */

const logger = require('./logger');

/**
 * Standardized error response format
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {string} error - User-friendly error message
 * @property {string} [code] - Optional error code for client handling
 * @property {Object} [details] - Optional additional error details (dev only)
 */

class ErrorHandler {
  /**
   * Handle API errors with consistent logging and response format
   * @param {Object} res - Express response object
   * @param {Error|string} error - Error object or message
   * @param {string} action - Action that failed (e.g., "create conversation")
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} [errorCode] - Optional error code for client handling
   */
  static handleAPIError(res, error, action, statusCode = 500, errorCode = null) {
    // Log the full error for debugging
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : null;
    
    logger.error(`Failed to ${action}`, {
      error: errorMessage,
      stack: errorStack,
      statusCode,
      timestamp: new Date().toISOString()
    });

    // Create standardized response
    const response = {
      success: false,
      error: `Failed to ${action}`
    };

    if (errorCode) {
      response.code = errorCode;
    }

    // Include error details in development only
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      response.details = {
        message: error.message,
        stack: error.stack
      };
    }

    res.status(statusCode).json(response);
  }

  /**
   * Handle validation errors (400 status)
   * @param {Object} res - Express response object
   * @param {Error|string} error - Validation error
   * @param {string} field - Field that failed validation
   */
  static handleValidationError(res, error, field) {
    this.handleAPIError(res, error, `validate ${field}`, 400, 'VALIDATION_ERROR');
  }

  /**
   * Handle authentication errors (401 status)
   * @param {Object} res - Express response object
   * @param {string} message - Authentication error message
   */
  static handleAuthError(res, message = 'authenticate user') {
    this.handleAPIError(res, message, 'authenticate', 401, 'AUTH_ERROR');
  }

  /**
   * Handle authorization errors (403 status)
   * @param {Object} res - Express response object
   * @param {string} action - Action that was forbidden
   */
  static handleForbiddenError(res, action) {
    this.handleAPIError(res, `Access denied`, action, 403, 'FORBIDDEN_ERROR');
  }

  /**
   * Handle not found errors (404 status)
   * @param {Object} res - Express response object
   * @param {string} resource - Resource that wasn't found
   */
  static handleNotFoundError(res, resource) {
    this.handleAPIError(res, `${resource} not found`, `find ${resource}`, 404, 'NOT_FOUND_ERROR');
  }

  /**
   * Handle rate limiting errors (429 status)
   * @param {Object} res - Express response object
   * @param {string} action - Action that was rate limited
   */
  static handleRateLimitError(res, action) {
    this.handleAPIError(res, 'Too many requests', action, 429, 'RATE_LIMIT_ERROR');
  }

  /**
   * Handle database errors with specific error codes
   * @param {Object} res - Express response object
   * @param {Error} error - Database error
   * @param {string} action - Database action that failed
   */
  static handleDatabaseError(res, error, action) {
    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';

    // Handle specific SQLite errors
    if (error.code === 'SQLITE_CONSTRAINT') {
      statusCode = 400;
      errorCode = 'CONSTRAINT_ERROR';
    } else if (error.code === 'SQLITE_NOTFOUND') {
      statusCode = 404;
      errorCode = 'NOT_FOUND_ERROR';
    }

    this.handleAPIError(res, error, action, statusCode, errorCode);
  }

  /**
   * Handle external API errors (Groq, etc.)
   * @param {Object} res - Express response object
   * @param {Error} error - External API error
   * @param {string} service - External service name
   * @param {string} action - Action that failed
   */
  static handleExternalAPIError(res, error, service, action) {
    let statusCode = 500;
    let errorCode = 'EXTERNAL_API_ERROR';

    // Handle specific external API error codes
    if (error.response?.status === 401) {
      statusCode = 401;
      errorCode = 'API_AUTH_ERROR';
    } else if (error.response?.status === 429) {
      statusCode = 429;
      errorCode = 'API_RATE_LIMIT_ERROR';
    } else if (error.response?.status >= 400 && error.response?.status < 500) {
      statusCode = 400;
      errorCode = 'API_CLIENT_ERROR';
    }

    this.handleAPIError(res, error, `${action} via ${service}`, statusCode, errorCode);
  }

  /**
   * Create a success response with consistent format
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} [message] - Optional success message
   * @param {number} [statusCode] - HTTP status code (default: 200)
   */
  static handleSuccess(res, data, message = null, statusCode = 200) {
    const response = {
      success: true,
      data
    };

    if (message) {
      response.message = message;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Async wrapper for route handlers to catch unhandled errors
   * @param {Function} fn - Async route handler function
   * @returns {Function} - Wrapped route handler
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Global error middleware for Express
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static globalErrorHandler(err, req, res, next) {
    // Log the error
    logger.error('Unhandled error in request', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Send error response
    const statusCode = err.statusCode || 500;
    const response = {
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = {
        stack: err.stack,
        url: req.url,
        method: req.method
      };
    }

    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;