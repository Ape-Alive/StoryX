const { PrismaClient } = require('@prisma/client');
const config = require('../config');

// 创建全局 Prisma Client 实例
let prismaInstance = null;

/**
 * Get Prisma Client instance
 * @returns {PrismaClient} Prisma Client instance
 */
function getPrisma() {
  // 优先使用已初始化的数据库连接（服务器运行时）
  const database = require('../config/database');
  if (database && database.prisma) {
    return database.prisma;
  }

  // 如果数据库未连接，创建新的 Prisma Client 实例（用于测试或独立脚本）
  // 注意：这种情况下需要确保 DATABASE_URL 环境变量已正确设置
  if (!prismaInstance) {
    // 确保使用正确的数据库路径
    const dbUrl = process.env.DATABASE_URL || config.database.url;
    if (dbUrl) {
      process.env.DATABASE_URL = dbUrl;
    }

    prismaInstance = new PrismaClient({
      log: config.server.env === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }
  return prismaInstance;
}

module.exports = { getPrisma };

