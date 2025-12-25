require('dotenv').config();
const path = require('path');
const fs = require('fs');

// 解析数据库路径（在配置加载时就处理，确保 Prisma 能正确读取）
function resolveDatabaseUrl() {
    let dbUrl = process.env.DATABASE_URL || 'file:./prisma/data/storyx.db';
    let dbPath = dbUrl.replace('file:', '');

    // 如果已经是绝对路径，直接返回
    if (path.isAbsolute(dbPath)) {
        return dbUrl;
    }

    // 解析相对路径为绝对路径
    // 基于项目根目录（BackEnd/）解析
    const projectRoot = path.join(__dirname, '..');
    const resolvedPath = path.resolve(projectRoot, dbPath);

    // 更新环境变量，确保 Prisma 使用正确的路径
    process.env.DATABASE_URL = `file:${resolvedPath}`;

    return process.env.DATABASE_URL;
}

// 在配置加载时就解析数据库路径
const resolvedDbUrl = resolveDatabaseUrl();

module.exports = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        env: process.env.NODE_ENV || 'development',
    },

    // Database Configuration
    database: {
        url: resolvedDbUrl,
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expire: process.env.JWT_EXPIRE || '7d',
    },

    // File Upload Configuration
    upload: {
        maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
        path: process.env.UPLOAD_PATH || './uploads',
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain'],
    },

    // Novel File Storage Configuration
    novel: {
        libraryPath: process.env.NOVEL_LIBRARY_PATH || './library', // 小说库目录
    },

    // File Storage Service Configuration
    fileStorage: {
        basePath: process.env.STORAGE_BASE_PATH || './storage', // 文件存储基础路径
        catboxApiUrl: process.env.CATBOX_API_URL || 'https://catbox.moe/user/api.php',
        catboxUserHash: process.env.CATBOX_USER_HASH || '930908407679b3193e165a38b', // Catbox 用户哈希
        proxyUrl: process.env.PROXY_URL || 'http://127.0.0.1:7890', // 代理地址（可选，如 'http://127.0.0.1:7890'）
        uploadTimeout: process.env.UPLOAD_TIMEOUT || 60000, // 上传超时时间（毫秒）
    },

    // Root Path Configuration
    rootPath: path.join(__dirname, '..'), // 项目根目录

    // AI Service Configuration
    ai: {
        apiKey: process.env.AI_API_KEY || '',
        apiUrl: process.env.AI_API_URL || 'https://api.example.com',
    },

    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log',
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes (900000ms)
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300, // 300 requests per 15 minutes
    },
};

