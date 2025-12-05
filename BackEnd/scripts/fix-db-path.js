/**
 * 检查数据库路径配置
 * 运行: node scripts/fix-db-path.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

console.log('当前工作目录:', process.cwd());
console.log('脚本所在目录:', __dirname);

// 读取 .env 文件
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (dbUrlMatch) {
        console.log('当前 DATABASE_URL:', dbUrlMatch[1]);
    } else {
        console.log('未找到 DATABASE_URL');
    }
} else {
    console.log('.env 文件不存在');
}

// 检查数据库文件
const dbPath = path.resolve(__dirname, '..', 'prisma/data/storyx.db');
console.log('数据库文件路径:', dbPath);
console.log('数据库文件存在:', fs.existsSync(dbPath));

console.log('\n提示: 确保在 BackEnd 目录下运行 npm run prisma:studio');

