# Prisma Studio 数据不显示问题修复

## 问题原因

Prisma Studio 在运行时，可能因为以下原因无法显示数据：

1. **环境变量未正确加载** - Prisma Studio 可能没有读取到 `.env` 文件
2. **数据库路径问题** - 相对路径在不同工作目录下可能解析错误
3. **多个数据库文件** - 可能存在多个数据库文件，Prisma Studio 连接到了空的数据库

## 解决方案

### 方法 1: 使用启动脚本（推荐）

项目已经包含了一个启动脚本，会自动确保在正确的目录下运行：

```bash
cd BackEnd
npm run prisma:studio
```

这个脚本会：
- 自动切换到项目根目录
- 验证数据库文件存在
- 使用相对路径启动 Prisma Studio

### 方法 2: 手动确保在正确目录运行

如果直接使用 `prisma studio` 命令，必须确保在 `BackEnd` 目录下运行：

```bash
cd BackEnd
npx prisma studio
```

**重要**：必须在 `BackEnd` 目录下运行，这样相对路径才能正确解析。

### 方法 3: 检查数据库文件

运行检查脚本确认数据库连接：

```bash
cd BackEnd
node scripts/check-db.js
```

这个脚本会：
- 检查环境变量配置
- 验证数据库文件是否存在
- 显示数据统计信息
- 列出所有表和数据

### 方法 4: 检查环境变量配置

确保 `.env` 文件中的 `DATABASE_URL` 使用相对路径：

```
DATABASE_URL="file:./prisma/data/storyx.db"
```

**注意**：不要使用绝对路径，这样在分发代码给其他人时会报错。

### 方法 5: 重新生成 Prisma Client

如果问题仍然存在，尝试重新生成 Prisma Client：

```bash
cd BackEnd
npm run prisma:generate
npm run prisma:studio
```

## 验证数据是否存在

### 使用 SQLite 命令行工具

```bash
cd BackEnd
sqlite3 prisma/data/storyx.db "SELECT COUNT(*) FROM User;"
sqlite3 prisma/data/storyx.db "SELECT COUNT(*) FROM Project;"
```

### 使用检查脚本

```bash
cd BackEnd
node scripts/check-db.js
```

## 常见问题

### Q: Prisma Studio 显示 "No data" 或空表

**A:** 检查：
1. 是否在正确的目录下运行（`BackEnd` 目录）
2. `.env` 文件中的 `DATABASE_URL` 是否正确
3. 数据库文件是否真的存在数据

### Q: 数据库连接失败

**A:**
1. 确认数据库文件路径正确
2. 检查文件权限
3. 确认数据库文件没有被其他进程锁定

### Q: 显示的数据和实际不一致

**A:** 可能连接到了不同的数据库文件。检查：
```bash
find . -name "*.db" -type f
```

## 快速修复步骤

1. **确认当前目录**
   ```bash
   cd BackEnd
   pwd  # 应该显示 /Users/.../StoryX/BackEnd
   ```

2. **检查数据库文件**
   ```bash
   ls -la prisma/data/storyx.db
   ```

3. **检查环境变量**
   ```bash
   cat .env | grep DATABASE_URL
   ```

4. **运行检查脚本**
   ```bash
   node scripts/check-db.js
   ```

5. **启动 Prisma Studio**
   ```bash
   npm run prisma:studio
   ```

## 如果仍然无法显示数据

1. **检查是否有多个数据库文件**
2. **确认数据是否真的存在**（使用 SQLite 命令行工具）
3. **尝试重新生成 Prisma Client**
4. **检查 Prisma Studio 的浏览器控制台**是否有错误信息

