# StoryX Backend 快速启动指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

这将自动：
- 安装所有依赖包
- 生成 Prisma Client（通过 postinstall 脚本）

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，至少设置以下配置：

```env
DATABASE_URL="file:./data/storyx.db"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3000
```

### 3. 初始化数据库

运行数据库迁移以创建表结构：

```bash
npm run prisma:migrate
```

首次运行时会提示输入迁移名称，可以直接按回车使用默认名称。

### 4. 启动服务器

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 验证安装

访问健康检查端点：

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1.234
}
```

## 数据库管理

### 查看数据库

使用 Prisma Studio 可视化查看和编辑数据库：

```bash
npm run prisma:studio
```

这将打开一个 Web 界面（通常是 http://localhost:5555），你可以在其中查看和编辑数据。

### 创建新的迁移

当你修改 `prisma/schema.prisma` 后，需要创建新的迁移：

```bash
npm run prisma:migrate
```

### 重置数据库（开发环境）

如果需要重置数据库（会删除所有数据）：

```bash
npx prisma migrate reset
```

## 常见问题

### 问题：Prisma Client 未生成

**解决方案：**

```bash
npm run prisma:generate
```

### 问题：数据库文件不存在

**解决方案：**

确保 `data` 目录存在，或者数据库文件路径正确。数据库文件会在首次迁移时自动创建。

### 问题：端口已被占用

**解决方案：**

修改 `.env` 文件中的 `PORT` 配置，使用其他端口。

## 下一步

- 查看 [README.md](./README.md) 了解完整的 API 文档
- 查看 `prisma/schema.prisma` 了解数据模型
- 开始开发你的功能模块

