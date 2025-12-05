const { PrismaClient } = require('@prisma/client');
const config = require('./index');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.prisma = null;
        this.resolvedDbPath = null;
    }

    /**
     * 解析数据库路径（将相对路径转换为绝对路径）
     */
    resolveDatabasePath() {
        let dbPath = config.database.url.replace('file:', '');

        // 如果已经是绝对路径，直接返回
        if (path.isAbsolute(dbPath)) {
            return dbPath;
        }

        // 解析相对路径
        // 相对路径应该相对于项目根目录（BackEnd/），而不是 prisma/ 目录
        // 例如：./prisma/data/storyx.db 应该解析为 BackEnd/prisma/data/storyx.db
        // config 目录在 BackEnd/config/，所以需要回到 BackEnd/ 目录
        const projectRoot = path.join(__dirname, '..');
        dbPath = path.resolve(projectRoot, dbPath);

        return dbPath;
    }

    async connect() {
        try {
            // 获取已解析的数据库路径（在 config/index.js 中已处理）
            let dbPath = config.database.url.replace('file:', '');

            // 确保使用绝对路径（防止在 prisma/ 目录下运行时创建错误的 prisma/prisma/ 目录）
            if (!path.isAbsolute(dbPath)) {
                const projectRoot = path.join(__dirname, '..');
                dbPath = path.resolve(projectRoot, dbPath);
            }

            this.resolvedDbPath = dbPath;

            // 确保目录存在
            const dbDir = path.dirname(dbPath);
            if (dbDir && !fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Initialize Prisma Client
            // DATABASE_URL 已经在 config/index.js 中解析为绝对路径
            this.prisma = new PrismaClient({
                log: config.server.env === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : ['error'],
            });

            // Test connection
            await this.prisma.$connect();

            logger.info('Database connected successfully', { dbPath });

            return this.prisma;
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.prisma) {
                await this.prisma.$disconnect();
                logger.info('Database disconnected successfully');
            }
        } catch (error) {
            logger.error('Database disconnection error:', error);
            throw error;
        }
    }

    getClient() {
        if (!this.prisma) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.prisma;
    }
}

module.exports = new Database();

