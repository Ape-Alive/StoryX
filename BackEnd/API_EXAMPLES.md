# API 使用示例

## 创建项目

### 请求

**POST** `/api/projects`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**请求体示例（完整配置，包含密钥）：**

```json
{
  "title": "我的动画项目",
  "description": "这是一个测试项目",
  "sourceText": "从前有一个小王子...",
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

**请求体示例（最小配置）：**

```json
{
  "title": "我的动画项目",
  "storageLocation": "local"
}
```

**请求体示例（使用远程存储，包含密钥）：**

```json
{
  "title": "我的动画项目",
  "description": "使用远程存储的项目",
  "configLLM": "deepseek",
  "configLLMKey": "sk-xxxxxxxxxxxxx",
  "configVideoAI": "custom-video-ai",
  "configVideoAIKey": "video-api-key-xxxxx",
  "configTTS": "custom-tts",
  "configTTSKey": "tts-api-key-xxxxx",
  "configImageGen": "stable-diffusion",
  "configImageGenKey": "sd-api-key-xxxxx",
  "storageLocation": "remote"
}
```

### 响应

**成功响应 (201 Created):**

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "title": "我的动画项目",
    "description": "这是一个测试项目",
    "sourceText": "从前有一个小王子...",
    "configLLM": "deepseek",
    "configVideoAI": "default",
    "configTTS": "default",
    "configImageGen": "default",
    "storageLocation": "local",
    "status": "pending",
    "progress": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应 (400 Bad Request):**

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "msg": "Storage location is required",
      "param": "storageLocation",
      "location": "body"
    }
  ]
}
```

## 字段说明

### 必填字段

- **title** (string): 项目名称
- **storageLocation** (string): 存储位置，必须是 `"local"` 或 `"remote"`

### 可选字段

- **description** (string): 项目描述
- **sourceText** (string): 源文本内容（创建时可不填，但开始处理时必须提供）
- **configLLM** (string): LLM AI 配置，默认值 `"deepseek"`
- **configLLMKey** (string): LLM API 密钥（**如果配置了 configLLM，此字段必填**，加密存储，不会在响应中返回）
- **configVideoAI** (string): 视频 AI 配置，默认值 `"default"`
- **configVideoAIKey** (string): 视频 AI API 密钥（**如果配置了 configVideoAI，此字段必填**，加密存储，不会在响应中返回）
- **configTTS** (string): 声音合成配置，默认值 `"default"`
- **configTTSKey** (string): TTS API 密钥（**如果配置了 configTTS，此字段必填**，加密存储，不会在响应中返回）
- **configImageGen** (string): 图片生成配置，默认值 `"default"`
- **configImageGenKey** (string): 图片生成 API 密钥（**如果配置了 configImageGen，此字段必填**，加密存储，不会在响应中返回）

**重要规则**:
- 如果配置了服务（configLLM、configVideoAI、configTTS、configImageGen），对应的密钥（configLLMKey、configVideoAIKey、configTTSKey、configImageGenKey）**必须提供**
- 如果不配置服务，则不需要提供对应的密钥
- 密钥在存储时会自动加密，在 API 响应中不会返回

## 使用场景

### 场景 1: 快速创建项目（稍后添加文本）

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新项目",
    "storageLocation": "local"
  }'
```

### 场景 2: 创建完整配置的项目（包含密钥）

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完整配置项目",
    "description": "使用所有自定义配置",
    "sourceText": "小说文本内容...",
    "configLLM": "deepseek",
    "configLLMKey": "sk-xxxxxxxxxxxxx",
    "configVideoAI": "custom-video-ai",
    "configVideoAIKey": "video-api-key-xxxxx",
    "configTTS": "custom-tts",
    "configTTSKey": "tts-api-key-xxxxx",
    "configImageGen": "stable-diffusion",
    "configImageGenKey": "sd-api-key-xxxxx",
    "storageLocation": "remote"
  }'
```

### 场景 3: 使用默认配置创建项目

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "默认配置项目",
    "description": "使用所有默认配置",
    "sourceText": "小说文本内容...",
    "storageLocation": "local"
  }'
```

## 更新项目配置

如果需要更新项目的配置或密钥，可以使用更新接口：

**PUT** `/api/projects/:id`

```json
{
  "configLLM": "gpt-4",
  "configLLMKey": "new-api-key-xxxxx",
  "configVideoAI": "new-video-ai",
  "configVideoAIKey": "new-video-key-xxxxx",
  "storageLocation": "remote"
}
```

**注意**:
- 更新密钥时，只需提供新的密钥值，系统会自动加密存储
- 响应中不会返回密钥字段
- 可以只更新部分配置，不需要提供所有字段

