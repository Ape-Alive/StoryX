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
const mediaRoutes = require('./routes/mediaRoutes');
const materialRoutes = require('./routes/materialRoutes');
const globalConfigRoutes = require('./routes/globalConfigRoutes');

// Initialize Express app
const app = express();

// Security middleware
// 根据环境配置 CSP：开发环境允许任意 localhost 端口，生产环境更严格
const isDevelopment = config.server.env === 'development';
const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    // mediaSrc: 控制前端页面中 <video> 和 <audio> 元素可以加载资源的来源
    // 开发环境：使用 '*' 允许所有来源（支持任意前端端口和域名）
    // 生产环境：可根据需要限制为特定域名（通过 CORS_ORIGIN 环境变量配置）
    mediaSrc: isDevelopment
        ? ["*"]  // 开发环境：允许所有来源，支持任意端口
        : ["'self'", process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : "*"],  // 生产环境：使用配置的 CORS_ORIGIN（支持多个域名，逗号分隔）
    connectSrc: ["'self'", "http://localhost:3000"],
};

app.use(helmet({
    contentSecurityPolicy: {
        directives: cspDirectives,
    },
    // crossOriginResourcePolicy: 控制资源的跨域访问策略
    // 设置为 "cross-origin" 允许其他域访问这些资源（如视频、图片等）
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with CORS support
// 为静态文件服务添加CORS头，确保跨域访问
const staticCorsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
};

app.use(express.static('public'));
// 静态文件服务：uploads 和 storage 目录（带CORS支持）
app.use('/uploads', cors(staticCorsOptions), express.static('uploads'));
app.use('/storage', cors(staticCorsOptions), express.static('storage'));

// Compression middleware
app.use(compression());

// Rate limiting
// 在开发环境中大幅放宽限制，生产环境使用严格限制
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.server.env === 'development'
        ? 10000  // 开发环境：15分钟内允许10000次请求（基本不限制）
        : config.rateLimit.maxRequests,  // 生产环境：使用配置的限制
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
app.use('/api/media', mediaRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/global-config', globalConfigRoutes);

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

