const authService = require('../services/authService');
const ResponseUtil = require('../utils/response');
const asyncHandler = require('../middleware/asyncHandler');

class AuthController {
    /**
     * Register a new user
     * POST /api/auth/register
     */
    register = asyncHandler(async (req, res) => {
        const { user, token } = await authService.register(req.body);
        ResponseUtil.success(res, { user, token }, 'User registered successfully', 201);
    });

    /**
     * Login user
     * POST /api/auth/login
     */
    login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const { user, token } = await authService.login(email, password);
        ResponseUtil.success(res, { user, token }, 'Login successful');
    });

    /**
     * Get current user
     * GET /api/auth/me
     */
    getMe = asyncHandler(async (req, res) => {
        const user = await authService.getCurrentUser(req.user.id);
        ResponseUtil.success(res, user, 'User retrieved successfully');
    });
}

module.exports = new AuthController();

