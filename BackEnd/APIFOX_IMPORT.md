# 将 StoryX API 同步到 Apifox

本指南将帮助您将 StoryX API 接口同步到 Apifox 进行测试和管理。

## 方法一：通过 URL 导入（推荐）

### 步骤：

1. **启动后端服务器**
   ```bash
   cd BackEnd
   npm run dev
   ```

2. **打开 Apifox**
   - 打开 Apifox 应用
   - 创建新项目或选择现有项目

3. **导入接口**
   - 点击左侧菜单的 **"导入"** 按钮
   - 选择 **"URL 导入"** 或 **"OpenAPI/Swagger"**
   - 输入以下 URL：
     ```
     http://localhost:3000/api-docs.json
     ```
   - 点击 **"导入"** 按钮

4. **配置环境变量**
   - 在 Apifox 中创建环境变量
   - 设置 `baseUrl` 为 `http://localhost:3000`
   - 设置 `token` 变量（登录后会自动获取）

## 方法二：通过文件导入

### 步骤：

1. **导出 OpenAPI 规范文件**
   ```bash
   cd BackEnd
   npm run docs:export
   ```
   这会在项目根目录生成 `openapi.json` 文件。

2. **在 Apifox 中导入**
   - 打开 Apifox
   - 点击 **"导入"** → **"文件导入"**
   - 选择 **"OpenAPI/Swagger"**
   - 选择刚才生成的 `openapi.json` 文件
   - 点击 **"导入"**

## 方法三：通过 Swagger UI 查看文档

1. **启动服务器**
   ```bash
   cd BackEnd
   npm run dev
   ```

2. **访问 Swagger UI**
   在浏览器中打开：
   ```
   http://localhost:3000/api-docs
   ```

3. **从 Swagger UI 导入到 Apifox**
   - 在 Swagger UI 页面，点击右上角的 **"Download"** 按钮
   - 下载 OpenAPI JSON 文件
   - 在 Apifox 中导入该文件

## 配置 Apifox 环境

### 1. 创建环境

在 Apifox 中创建以下环境：

**开发环境 (Development)**
- `baseUrl`: `http://localhost:3000`
- `token`: (登录后获取的 JWT token)

### 2. 设置全局认证

1. 在 Apifox 项目设置中，找到 **"认证"** 选项
2. 选择 **"Bearer Token"** 认证方式
3. 设置 Token 变量为 `{{token}}`

### 3. 设置前置脚本（自动获取 Token）

在需要认证的接口中，可以添加前置脚本来自动获取 token：

```javascript
// 前置脚本：自动登录获取 token
if (!pm.environment.get("token")) {
    pm.sendRequest({
        url: pm.environment.get("baseUrl") + "/api/auth/login",
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                email: "test@example.com",
                password: "123456"
            })
        }
    }, function (err, res) {
        if (res.json().success) {
            pm.environment.set("token", res.json().data.token);
        }
    });
}
```

## 接口分组

导入后，接口会自动按照以下分组：

- **Authentication** - 认证相关接口
  - POST `/api/auth/register` - 注册
  - POST `/api/auth/login` - 登录
  - GET `/api/auth/me` - 获取当前用户

- **Projects** - 项目相关接口
  - GET `/api/projects` - 获取项目列表
  - GET `/api/projects/:id` - 获取项目详情
  - POST `/api/projects` - 创建项目
  - PUT `/api/projects/:id` - 更新项目
  - DELETE `/api/projects/:id` - 删除项目
  - POST `/api/projects/:id/process` - 开始处理项目

- **Characters** - 角色相关接口
  - GET `/api/characters` - 获取角色列表
  - GET `/api/characters/:id` - 获取角色详情
  - POST `/api/characters` - 创建角色
  - PUT `/api/characters/:id` - 更新角色
  - DELETE `/api/characters/:id` - 删除角色

- **AI Models** - AI 模型相关接口
  - GET `/api/ai-models/config-options` - 获取配置选项
  - GET `/api/ai-models/providers` - 获取所有提供商
  - GET `/api/ai-models/grouped` - 获取分组模型
  - GET `/api/ai-models/type/:type` - 按类型获取模型
  - GET `/api/ai-models/:id` - 获取模型详情

## 测试流程

1. **先注册/登录获取 Token**
   - 调用 `POST /api/auth/register` 或 `POST /api/auth/login`
   - 复制返回的 `token` 值

2. **设置 Token 到环境变量**
   - 在 Apifox 环境变量中设置 `token`

3. **测试需要认证的接口**
   - 所有 `/api/projects` 和 `/api/characters` 接口都需要认证
   - Token 会自动通过 Bearer Token 方式发送

## 更新接口文档

当您修改了路由或添加了新接口后：

1. **更新 OpenAPI 注释**
   - 在路由文件中添加或更新 Swagger 注释

2. **重新导出**
   ```bash
   npm run docs:export
   ```

3. **在 Apifox 中同步**
   - 如果使用 URL 导入，Apifox 可以设置自动同步
   - 或者手动重新导入 `openapi.json` 文件

## 常见问题

### Q: 导入后接口没有显示？
A: 检查路由文件中的 Swagger 注释格式是否正确。

### Q: 认证失败？
A: 确保：
1. Token 已正确设置到环境变量
2. Token 未过期
3. 认证方式设置为 Bearer Token

### Q: 如何自动同步？
A: 在 Apifox 中，可以设置数据源为 URL，并启用自动同步功能。

## 更多信息

- Swagger UI: http://localhost:3000/api-docs
- OpenAPI JSON: http://localhost:3000/api-docs.json
- 导出文件: `BackEnd/openapi.json`

