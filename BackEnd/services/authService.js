const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('../utils/prisma');
const config = require('../config');
const logger = require('../utils/logger');
const { UnauthorizedError, AppError, ValidationError } = require('../utils/errors');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} - User and token
   */
  async register(userData) {
    try {
      const { username, email, password } = userData;
      const prisma = getPrisma();

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new ValidationError('User already exists with this email or username');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
        },
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate token
      const token = this.generateToken(user.id);

      logger.info('User registered', { userId: user.id, username });

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Registration error:', error);
      throw new AppError('Failed to register user', 500);
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} - User and token
   */
  async login(email, password) {
    try {
      const prisma = getPrisma();

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate token
      const token = this.generateToken(user.id);

      logger.info('User logged in', { userId: user.id, email });

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new AppError('Failed to login', 500);
    }
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} - JWT token
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expire,
    });
  }

  /**
   * Get current user
   * @param {string} userId - User ID
   * @returns {Object} - User object
   */
  async getCurrentUser(userId) {
    try {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Get current user error:', error);
      throw new AppError('Failed to get user', 500);
    }
  }
}

module.exports = new AuthService();

