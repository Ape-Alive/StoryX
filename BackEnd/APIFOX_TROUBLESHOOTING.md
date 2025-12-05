# Apifox 数据不显示问题排查

## 问题现象
Apifox 中显示 "Showing 0 of 0"，但数据库中确实有记录。

## 可能原因和解决方案

### 1. 认证 Token 问题

**检查步骤：**
1. 在 Apifox 中，确保已正确设置认证 Token
2. 检查环境变量中的 `token` 是否有效
3. 确认 Token 未过期

**解决方法：**
1. 先调用 `POST /api/auth/login` 获取新的 Token
2. 将返回的 `token` 设置到环境变量中
3. 在项目设置中配置 Bearer Token 认证

### 2. 用户 ID 不匹配

**问题：**
- 数据库中的项目属于某个用户（userId）
- 当前登录的用户 ID 与项目所属用户 ID 不匹配
- 因此查询不到数据

**检查方法：**
```sql
-- 查看数据库中的用户和项目
SELECT u.id as userId, u.email, p.id as projectId, p.title
FROM User u
LEFT JOIN Project p ON u.id = p.userId;
```

**解决方法：**
- 确保使用创建项目时使用的同一个账号登录
- 或者使用该用户账号重新登录获取 Token

### 3. 响应数据路径配置

**问题：**
Apifox 可能期望直接返回数组，但实际返回的是：
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": {
    "projects": [...],
    "pagination": {...}
  }
}
```

**解决方法：**
在 Apifox 中配置数据路径：
1. 打开接口设置
2. 找到"后置操作"或"数据提取"
3. 设置数据路径为：`data.projects`
4. 或者配置响应解析规则

### 4. 分页参数问题

**检查：**
- 默认每页显示 10 条记录
- 如果数据在第 2 页，需要设置 `page=2`

**解决方法：**
在 Apifox 请求中添加查询参数：
- `page=1` (页码)
- `limit=10` (每页数量)

### 5. 状态筛选问题

**检查：**
- 如果设置了 `status` 查询参数
- 但数据库中的项目状态不匹配
- 也会导致查询不到数据

**解决方法：**
- 移除 `status` 查询参数
- 或者确保状态值匹配（pending, processing, completed 等）

## 快速测试方法

### 方法 1：直接测试 API

```bash
# 1. 先登录获取 Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 2. 使用返回的 Token 查询项目
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 方法 2：检查数据库

```bash
cd BackEnd
sqlite3 prisma/data/storyx.db "SELECT COUNT(*) FROM Project;"
sqlite3 prisma/data/storyx.db "SELECT id, userId, title FROM Project;"
```

### 方法 3：查看服务器日志

启动服务器时，查看控制台输出，确认：
- 请求是否到达服务器
- 用户 ID 是否正确
- 查询结果数量

## Apifox 配置建议

### 1. 配置环境变量

创建环境变量：
- `baseUrl`: `http://localhost:3000`
- `token`: (登录后获取的 JWT token)

### 2. 配置认证

在项目设置中：
1. 选择"认证" → "Bearer Token"
2. 设置 Token 变量为 `{{token}}`

### 3. 配置响应解析（如果需要）

如果 Apifox 无法自动解析响应：
1. 在接口的"后置操作"中
2. 添加"提取变量"
3. 设置 JSONPath 为：`$.data.projects[*]`

### 4. 测试流程

1. **先登录获取 Token**
   ```
   POST /api/auth/login
   Body: { "email": "test@example.com", "password": "123456" }
   ```

2. **设置 Token 到环境变量**
   - 复制响应中的 `data.token`
   - 设置到环境变量 `token`

3. **查询项目列表**
   ```
   GET /api/projects
   Headers: Authorization: Bearer {{token}}
   ```

## 常见错误

### 错误 1: "Not authorized to access this route"
- **原因**：Token 未设置或无效
- **解决**：重新登录获取 Token

### 错误 2: 返回空数组但数据库有数据
- **原因**：用户 ID 不匹配
- **解决**：使用创建项目时的账号登录

### 错误 3: 显示 0 条记录
- **原因**：分页或筛选参数问题
- **解决**：检查查询参数，移除不必要的筛选

## 调试技巧

1. **查看完整响应**
   - 在 Apifox 中查看"响应"标签
   - 检查 `data.projects` 数组是否为空
   - 检查 `data.pagination.total` 的值

2. **检查请求头**
   - 确认 `Authorization` 头正确设置
   - 格式：`Bearer <token>`

3. **查看服务器日志**
   - 启动服务器时查看控制台
   - 确认请求是否到达
   - 查看查询的用户 ID

## 联系支持

如果以上方法都无法解决问题，请提供：
1. Apifox 的请求和响应截图
2. 服务器日志
3. 数据库查询结果

