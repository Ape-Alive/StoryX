# 数据库迁移说明

## 项目模型更新

已更新 `Project` 模型，添加了以下新字段：

### 新增字段

1. **项目配置字段**（都有默认值）：
   - `configLLM`: LLM AI 选择，默认值为 `"deepseek"`
   - `configLLMKey`: LLM API 密钥（可选，加密存储）
   - `configVideoAI`: 视频 AI 选择，默认值为 `"default"`
   - `configVideoAIKey`: 视频 AI API 密钥（可选，加密存储）
   - `configTTS`: 声音合成选择，默认值为 `"default"`
   - `configTTSKey`: TTS API 密钥（可选，加密存储）
   - `configImageGen`: 图片生成选择，默认值为 `"default"`
   - `configImageGenKey`: 图片生成 API 密钥（可选，加密存储）

2. **存储位置字段**（必填）：
   - `storageLocation`: 项目文件存储位置，必须是 `"local"` 或 `"remote"`

3. **字段调整**：
   - `sourceText`: 从必填改为可选（创建项目时可以不填，但开始处理文本时必须提供）

## 执行迁移

### 1. 生成 Prisma Client

```bash
npm run prisma:generate
```

### 2. 创建并应用迁移

```bash
npm run prisma:migrate
```

迁移名称建议：`add_project_config_and_storage`

### 3. 验证迁移

迁移完成后，可以使用 Prisma Studio 查看数据库结构：

```bash
npm run prisma:studio
```

## API 变更

### 创建项目接口变更

**请求示例：**

```json
{
  "title": "我的第一个项目",
  "description": "项目描述（可选）",
  "sourceText": "小说文本内容（可选，但开始处理时必须提供）",
  "configLLM": "deepseek",
  "configLLMKey": "sk-xxxxxxxxxxxxx",
  "configVideoAI": "default",
  "configVideoAIKey": "video-api-key-xxxxx",
  "configTTS": "default",
  "configTTSKey": "tts-api-key-xxxxx",
  "configImageGen": "default",
  "configImageGenKey": "sd-api-key-xxxxx",
  "storageLocation": "local"
}
```

**必填字段：**
- `title`: 项目名称
- `storageLocation`: 存储位置（必须是 "local" 或 "remote"）

**可选字段：**
- `description`: 项目描述
- `sourceText`: 源文本（创建时可不填，但开始处理时必须提供）
- `configLLM`: LLM 配置（默认 "deepseek"）
- `configLLMKey`: LLM API 密钥（加密存储，不会在响应中返回）
- `configVideoAI`: 视频 AI 配置（默认 "default"）
- `configVideoAIKey`: 视频 AI API 密钥（加密存储，不会在响应中返回）
- `configTTS`: 声音合成配置（默认 "default"）
- `configTTSKey`: TTS API 密钥（加密存储，不会在响应中返回）
- `configImageGen`: 图片生成配置（默认 "default"）
- `configImageGenKey`: 图片生成 API 密钥（加密存储，不会在响应中返回）

## 注意事项

1. 如果数据库中已有项目数据，迁移会自动为现有项目设置默认值
2. `storageLocation` 是必填字段，创建新项目时必须提供
3. `sourceText` 在创建项目时是可选的，但在调用 `/api/projects/:id/process` 开始处理时必须存在
4. **密钥加密**: 所有 API 密钥在存储时会自动使用 AES-256-CBC 加密
5. **环境变量**: 需要在 `.env` 文件中设置 `ENCRYPTION_KEY` 用于加密密钥
6. **密钥安全**: 所有查询接口都不会返回密钥字段，确保密钥不会泄露
7. **内部使用**: 如需在服务内部使用密钥，使用 `projectService.getProjectWithKeys()` 方法获取解密后的密钥

