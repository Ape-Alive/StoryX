# Prisma Studio 问题排查

## 错误：The table `main.User` does not exist

### 问题原因

这个错误通常表示 Prisma Studio 连接到了错误的数据库文件，或者数据库文件不存在/为空。

### 解决步骤

#### 1. 检查数据库文件

```bash
cd BackEnd
find . -name "*.db" -type f
```

如果发现多个数据库文件，需要确认哪个是正确的：
```bash
# 检查每个数据库文件的数据
sqlite3 prisma/data/storyx.db "SELECT COUNT(*) FROM User;"
```

#### 2. 删除重复的数据库文件

如果发现 `prisma/prisma/data/storyx.db` 这样的错误路径，删除它：
```bash
rm -rf prisma/prisma
```

#### 3. 验证 .env 配置

确保 `.env` 文件中的 `DATABASE_URL` 使用相对路径：
```
DATABASE_URL="file:./prisma/data/storyx.db"
```

#### 4. 重新生成 Prisma Client

```bash
npm run prisma:generate
```

#### 5. 使用启动脚本

使用项目提供的启动脚本，它会自动处理路径问题：
```bash
npm run prisma:studio
```

或者直接运行脚本：
```bash
node scripts/start-prisma-studio.js
```

### 验证数据库连接

运行检查脚本：
```bash
node scripts/check-db.js
```

应该看到：
- ✅ 数据库文件存在
- ✅ 表列表包含 User, Project 等
- ✅ 数据统计显示有数据

### 如果仍然无法解决

1. **检查 Prisma Schema**
   ```bash
   cat prisma/schema.prisma | grep -A 5 "model User"
   ```

2. **运行迁移**
   ```bash
   npm run prisma:migrate
   ```

3. **检查数据库文件权限**
   ```bash
   ls -la prisma/data/storyx.db
   ```

4. **手动测试数据库连接**
   ```bash
   sqlite3 prisma/data/storyx.db ".tables"
   sqlite3 prisma/data/storyx.db "SELECT COUNT(*) FROM User;"
   ```

### 常见问题

**Q: 为什么会有多个数据库文件？**

A: 可能是在不同目录下运行过迁移或创建过数据库。确保只保留 `prisma/data/storyx.db` 这一个文件。

**Q: 为什么使用相对路径？**

A: 使用相对路径可以确保代码在不同机器上都能正常工作，不会因为绝对路径不同而报错。

**Q: Prisma Studio 显示空数据库**

A: 检查是否连接到了正确的数据库文件。使用启动脚本可以确保连接到正确的文件。

