# StoryX Backend API

基于 Node.js 和 Express 的分层架构后端服务，为 StoryX AI 动画视频生成平台提供 API 支持。

## 项目结构

```
BackEnd/
├── config/              # 配置文件
│   ├── index.js        # 主配置文件
│   └── database.js     # 数据库连接配置
├── controllers/        # 控制器层 - 处理 HTTP 请求和响应
│   ├── authController.js
│   ├── projectController.js
│   └── characterController.js
├── services/           # 服务层 - 业务逻辑
│   ├── authService.js
│   ├── projectService.js
│   ├── characterService.js
│   └── textProcessingService.js
├── prisma/             # Prisma 数据库配置
│   └── schema.prisma   # 数据库模型定义
├── routes/             # 路由层 - API 路由定义
│   ├── authRoutes.js
│   ├── projectRoutes.js
│   └── characterRoutes.js
├── middleware/         # 中间件层
│   ├── auth.js        # 认证中间件
│   ├── errorHandler.js # 错误处理中间件
│   ├── asyncHandler.js # 异步处理包装器
│   ├── validator.js   # 验证中间件
│   └── upload.js      # 文件上传中间件
├── utils/              # 工具函数
│   ├── logger.js      # 日志工具
│   ├── response.js    # 响应工具
│   ├── errors.js      # 错误类定义
│   └── prisma.js      # Prisma Client 工具
├── app.js              # Express 应用配置
├── server.js           # 服务器启动文件
├── package.json        # 项目依赖
└── README.md          # 项目文档
```

## 分层架构说明

### 1. 路由层 (Routes)
- 定义 API 端点
- 处理路由参数验证
- 调用对应的控制器方法

### 2. 控制器层 (Controllers)
- 处理 HTTP 请求和响应
- 调用服务层处理业务逻辑
- 返回标准化的 API 响应

### 3. 服务层 (Services)
- 包含核心业务逻辑
- 处理数据转换和计算
- 调用数据访问层

### 4. 数据模型层 (Prisma Schema)
- 使用 Prisma Schema 定义数据模型
- 包含数据验证规则和类型定义
- 定义数据关系和索引

### 5. 中间件层 (Middleware)
- 认证和授权
- 错误处理
- 请求验证
- 文件上传

### 6. 工具层 (Utils)
- 日志记录
- 响应格式化
- 错误类定义

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置相关参数：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置以下关键配置：
- `DATABASE_URL`: SQLite 数据库路径（默认 `file:./data/storyx.db`）
- `JWT_SECRET`: JWT 密钥
- `PORT`: 服务器端口（默认 3000）

### 3. 初始化数据库

生成 Prisma Client 并运行数据库迁移：

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. 启动服务器

开发模式（使用 nodemon）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### 项目相关

- `GET /api/projects` - 获取用户的所有项目
- `GET /api/projects/:id` - 获取项目详情
- `POST /api/projects` - 创建新项目
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `POST /api/projects/:id/process` - 开始文本处理

### 角色相关

- `GET /api/characters` - 获取用户的所有角色
- `GET /api/characters/:id` - 获取角色详情
- `POST /api/characters` - 创建新角色
- `PUT /api/characters/:id` - 更新角色
- `DELETE /api/characters/:id` - 删除角色

### 健康检查

- `GET /health` - 服务器健康状态

## 技术栈

- **Node.js** - 运行环境
- **Express** - Web 框架
- **SQLite** - 数据库（文件数据库，适合桌面应用）
- **Prisma** - ORM（对象关系映射）
- **JWT** - 身份认证
- **Winston** - 日志记录
- **Express Validator** - 数据验证
- **Helmet** - 安全中间件
- **CORS** - 跨域支持

## Prisma 命令

- `npm run prisma:generate` - 生成 Prisma Client
- `npm run prisma:migrate` - 运行数据库迁移
- `npm run prisma:studio` - 打开 Prisma Studio（数据库可视化工具）

## 开发规范

### 错误处理
- 使用自定义错误类（`AppError`, `ValidationError`, `NotFoundError` 等）
- 统一使用 `asyncHandler` 包装异步函数
- 全局错误处理中间件统一处理错误

### 响应格式
- 成功响应：
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

- 错误响应：
```json
{
  "success": false,
  "message": "Error message",
  "errors": []
}
```

### 日志记录
- 使用 Winston 记录日志
- 日志级别：error, warn, info, debug
- 日志文件保存在 `./logs/` 目录

## 安全特性

- JWT 身份认证
- 密码加密（bcrypt）
- 请求速率限制
- Helmet 安全头
- CORS 配置
- 输入验证和清理

## 数据库说明

本项目使用 **SQLite** 作为数据库，这是一个文件数据库，非常适合桌面应用程序：

- **无需独立数据库服务器**：SQLite 是嵌入式数据库，数据存储在单个文件中
- **易于打包**：数据库文件可以随应用一起打包分发
- **轻量级**：适合桌面应用场景
- **跨平台**：支持 Windows、macOS、Linux

数据库文件默认存储在 `./data/storyx.db`，可以通过环境变量 `DATABASE_URL` 配置。

## 待扩展功能

根据产品需求文档，以下功能模块待实现：

1. **脚本和分镜生成服务**
2. **视觉素材生成服务**（角色、场景）
3. **音频素材生成服务**（TTS、BGM、SFX）
4. **动画合成服务**
5. **渲染和输出服务**
6. **质量检测和修正服务**

## 桌面应用打包

由于使用 SQLite 文件数据库，此后端非常适合打包成桌面应用：

1. 数据库文件可以随应用一起分发
2. 无需用户安装和配置数据库服务器
3. 数据存储在本地，保护用户隐私
4. 可以使用 Electron、Tauri 等框架打包

## 许可证

ISC

