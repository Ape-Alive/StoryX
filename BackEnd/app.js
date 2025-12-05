const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const characterRoutes = require('./routes/characterRoutes');
const aiModelRoutes = require('./routes/aiModelRoutes');
const novelRoutes = require('./routes/novelRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const scriptRoutes = require('./routes/scriptRoutes');
const systemPromptRoutes = require('./routes/systemPromptRoutes');
const characterDrawRoutes = require('./routes/characterDrawRoutes');
const sceneRoutes = require('./routes/sceneRoutes');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3000"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static('public'));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StoryX API Documentation',
}));

// OpenAPI JSON endpoint (for Apifox import)
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
// characterDrawRoutes 必须在 characterRoutes 之前注册，避免 /:id 路由拦截 /:characterId/draw-tasks
app.use('/api/characters', characterDrawRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/ai-models', aiModelRoutes);
app.use('/api/text', novelRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/novels', scriptRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/system-prompts', systemPromptRoutes);
app.use('/api/scenes', sceneRoutes);

// 404 handler
app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;

