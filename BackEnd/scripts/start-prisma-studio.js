#!/usr/bin/env node
/**
 * Prisma Studio 启动脚本
 * 确保在正确的目录下运行，以便相对路径能正确解析
 * 运行: node scripts/start-prisma-studio.js
 * 或: npm run prisma:studio
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 获取脚本所在目录（BackEnd/scripts/）
const scriptDir = __dirname;
// 获取项目根目录（BackEnd/）
const projectRoot = path.join(scriptDir, '..');

// 切换到项目根目录
process.chdir(projectRoot);

console.log('当前工作目录:', process.cwd());
console.log('项目根目录:', projectRoot);

// 检查 .env 文件
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (dbUrlMatch) {
        console.log('DATABASE_URL:', dbUrlMatch[1]);
    }
}

// 加载环境变量
require('dotenv').config({ path: envPath });

// 获取原始 DATABASE_URL（可能是相对路径）
let originalDbUrl = process.env.DATABASE_URL || 'file:./prisma/data/storyx.db';
console.log('原始 DATABASE_URL:', originalDbUrl);

// 解析为绝对路径（用于 Prisma Studio）
let dbPathFromUrl = originalDbUrl.replace('file:', '');
if (!path.isAbsolute(dbPathFromUrl)) {
    // 相对路径：基于项目根目录解析
    dbPathFromUrl = path.resolve(projectRoot, dbPathFromUrl);
}
const absoluteDbUrl = `file:${dbPathFromUrl}`;

console.log('解析后的数据库路径:', dbPathFromUrl);
console.log('使用的 DATABASE_URL (绝对路径):', absoluteDbUrl);

// 验证数据库文件
const dbPath = dbPathFromUrl;
if (fs.existsSync(dbPath)) {
    console.log('✅ 数据库文件存在:', dbPath);
} else {
    console.error('❌ 错误: 数据库文件不存在:', dbPath);
    console.error('请检查 .env 文件中的 DATABASE_URL 配置');
    process.exit(1);
}

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    console.log('创建数据库目录:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('\n启动 Prisma Studio...');
console.log('工作目录:', projectRoot);
console.log('数据库路径:', dbPath);
console.log('DATABASE_URL:', absoluteDbUrl);
console.log('');

// 启动 Prisma Studio
// 注意：Prisma Studio 需要从项目根目录运行，并且 DATABASE_URL 必须是相对于项目根目录的路径
try {
    // 设置环境变量，确保 Prisma Studio 能正确读取
    // 注意：使用绝对路径，这样 Prisma Studio 才能正确找到数据库文件
    const env = {
        ...process.env,
        DATABASE_URL: absoluteDbUrl, // 使用绝对路径
        PWD: projectRoot, // 设置工作目录环境变量
    };

    // 确保在项目根目录下运行
    execSync('npx prisma studio', {
        stdio: 'inherit',
        cwd: projectRoot,
        env: env,
        shell: true,
    });
} catch (error) {
    // 用户按 Ctrl+C 退出是正常的
    if (error.signal === 'SIGINT') {
        console.log('\nPrisma Studio 已关闭');
        process.exit(0);
    }
    console.error('启动 Prisma Studio 失败:', error.message);
    throw error;
}

