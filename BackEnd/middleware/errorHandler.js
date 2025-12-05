const logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');
const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        const message = 'Invalid JSON format. Please ensure all special characters (like newlines) in JSON strings are properly escaped (use \\n instead of actual newlines).';
        error = new AppError(message, 400);
    }

    // Log error
    logger.error(`Error: ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    // Prisma errors
    if (err.code === 'P2002') {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 400);
    }

    if (err.code === 'P2025') {
        const message = 'Resource not found';
        error = new AppError(message, 404);
    }

    if (err.code === 'P2003') {
        const message = 'Invalid reference';
        error = new AppError(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new AppError(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new AppError(message, 401);
    }

    // Send error response
    if (error.isOperational) {
        if (error.errors) {
            return ResponseUtil.error(res, error.message, error.statusCode, error.errors);
        }
        return ResponseUtil.error(res, error.message, error.statusCode);
    }

    // Programming or unknown error
    const message = config.server.env === 'production'
        ? 'Internal Server Error'
        : err.message;

    return ResponseUtil.error(res, message, 500);
};

module.exports = errorHandler;

