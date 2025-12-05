/**
 * 检查数据库连接和数据
 * 运行: node scripts/check-db.js
 */

require('dotenv').config();
const path = require('path');

console.log('=== 环境变量检查 ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('当前工作目录:', process.cwd());

// 解析数据库路径
let dbUrl = process.env.DATABASE_URL || 'file:./prisma/data/storyx.db';
let dbPath = dbUrl.replace('file:', '');

if (!path.isAbsolute(dbPath)) {
    const projectRoot = path.join(__dirname, '..');
    dbPath = path.resolve(projectRoot, dbPath);
}

console.log('解析后的数据库路径:', dbPath);
console.log('数据库文件存在:', require('fs').existsSync(dbPath));

// 测试数据库连接
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
    try {
        // 直接使用 PrismaClient，不通过 utils
        const prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        });

        console.log('\n=== 数据库连接测试 ===');
        console.log('Prisma Client 数据库URL:', process.env.DATABASE_URL);

        // 检查表 - 使用原始 SQL 查询
        try {
            const tables = await prisma.$queryRaw`
                SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';
            `;
            console.log('表列表:', tables.map(t => t.name));
        } catch (e) {
            console.log('查询表失败:', e.message);
            // 尝试直接查询
            const result = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';`);
            console.log('表列表 (原始查询):', result);
        }

        // 检查数据
        const userCount = await prisma.user.count();
        const projectCount = await prisma.project.count();
        const characterCount = await prisma.character.count();
        const providerCount = await prisma.aIProvider.count();
        const modelCount = await prisma.aIModel.count();

        console.log('\n=== 数据统计 ===');
        console.log(`用户数量: ${userCount}`);
        console.log(`项目数量: ${projectCount}`);
        console.log(`角色数量: ${characterCount}`);
        console.log(`AI提供商数量: ${providerCount}`);
        console.log(`AI模型数量: ${modelCount}`);

        if (userCount > 0) {
            console.log('\n=== 用户列表 ===');
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    username: true,
                },
            });
            console.table(users);
        }

        if (projectCount > 0) {
            console.log('\n=== 项目列表 ===');
            const projects = await prisma.project.findMany({
                select: {
                    id: true,
                    userId: true,
                    title: true,
                    status: true,
                },
                take: 5,
            });
            console.table(projects);
        }

        await prisma.$disconnect();
        console.log('\n✅ 数据库连接正常！');

    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        process.exit(1);
    }
}

checkDatabase();

