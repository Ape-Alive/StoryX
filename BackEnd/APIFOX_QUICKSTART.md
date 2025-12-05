# Apifox 快速开始指南

## 🚀 快速导入（3 步）

### 步骤 1: 启动服务器
```bash
cd BackEnd
npm run dev
```

### 步骤 2: 在 Apifox 中导入
1. 打开 Apifox
2. 点击 **"导入"** → **"URL 导入"**
3. 输入：`http://localhost:3000/api-docs.json`
4. 点击 **"导入"**

### 步骤 3: 配置环境变量
在 Apifox 中创建环境变量：
- `baseUrl`: `http://localhost:3000`
- `token`: (登录后获取)

## 📝 测试流程

1. **登录获取 Token**
   - 调用 `POST /api/auth/login`
   - 请求体：
     ```json
     {
       "email": "test@example.com",
       "password": "123456"
     }
     ```
   - 复制返回的 `token`

2. **设置 Token**
   - 在 Apifox 环境变量中设置 `token` 变量
   - 或在项目设置中配置 Bearer Token 认证

3. **测试其他接口**
   - 现在可以测试所有需要认证的接口了

## 🔗 相关链接

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json
- **详细文档**: 查看 `APIFOX_IMPORT.md`

## 💡 提示

- 如果接口有更新，重新运行 `npm run docs:export` 导出最新文档
- 可以在 Apifox 中设置自动同步 URL，这样接口更新会自动同步

