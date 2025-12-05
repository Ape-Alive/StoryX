# 相对路径 vs 绝对路径说明

## 为什么相对路径会有问题？

### 问题根源

Prisma 在解析相对路径时，有两个不同的上下文：

1. **Schema 解析时**：相对路径是相对于 `schema.prisma` 文件的位置（即 `prisma/` 目录）
2. **运行时**：相对路径是相对于进程的当前工作目录（`process.cwd()`）

### 示例

假设你的项目结构：
```
BackEnd/
├── prisma/
│   ├── schema.prisma
│   └── data/
│       └── storyx.db
└── server.js
```

**情况 1：从 BackEnd 目录启动**
```bash
cd BackEnd
node server.js
```
- `process.cwd()` = `/path/to/BackEnd`
- 相对路径 `./prisma/data/storyx.db` 解析为 `/path/to/BackEnd/prisma/data/storyx.db` ✅

**情况 2：从项目根目录启动**
```bash
cd StoryX
node BackEnd/server.js
```
- `process.cwd()` = `/path/to/StoryX`
- 相对路径 `./prisma/data/storyx.db` 解析为 `/path/to/StoryX/prisma/data/storyx.db` ❌
- 实际路径应该是 `/path/to/StoryX/BackEnd/prisma/data/storyx.db`

## 解决方案

### 方案 1：使用绝对路径（当前方案）
- ✅ 无论从哪里启动都能工作
- ✅ 最可靠
- ❌ 不同机器需要修改配置

### 方案 2：改进相对路径解析（推荐）
在代码中将相对路径转换为绝对路径，基于项目根目录或 schema 文件位置。

### 方案 3：确保从固定目录启动
在 package.json 中设置工作目录，或使用启动脚本。

## 当前实现

我已经在 `config/database.js` 中添加了路径解析逻辑：

```javascript
// Resolve relative paths to absolute paths
if (!path.isAbsolute(dbPath)) {
  dbPath = path.resolve(process.cwd(), dbPath);
}
```

这样相对路径也能正常工作，只要确保从 BackEnd 目录启动应用。

## 建议

对于桌面应用打包场景，建议：
1. **开发环境**：使用相对路径（更灵活）
2. **生产环境**：使用绝对路径或基于应用安装目录的路径

