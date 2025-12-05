const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../config/swagger');

// 导出 OpenAPI 规范到文件
const outputPath = path.join(__dirname, '../openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');

console.log('✅ OpenAPI 规范已导出到:', outputPath);
console.log('📝 现在可以将此文件导入到 Apifox 了！');

