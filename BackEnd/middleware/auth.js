const jwt = require('jsonwebtoken');
const config = require('../config');
const ResponseUtil = require('../utils/response');
const { UnauthorizedError } = require('../utils/errors');
const asyncHandler = require('./asyncHandler');

/**
 * Authentication middleware
 */
const authenticate = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return ResponseUtil.unauthorized(res, 'Not authorized to access this route');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        return ResponseUtil.unauthorized(res, 'Invalid token');
    }
});

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = decoded;
        } catch (error) {
            // Ignore token errors for optional auth
        }
    }

    next();
});

module.exports = {
    authenticate,
    optionalAuth,
};

