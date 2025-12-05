# AI 模型配置 API 文档

## 概述

本系统提供了完整的 AI 提供商和模型管理功能，支持语言大模型（LLM）、视频大模型、图片生成和语音合成（TTS）四种类型的模型。

## 数据库模型

### AIProvider（AI 提供商）
- `id`: 唯一标识符
- `name`: 提供商名称（唯一）
- `displayName`: 显示名称
- `description`: 提供商描述
- `website`: 官网链接
- `logoUrl`: Logo 链接
- `isActive`: 是否启用

### AIModel（AI 模型）
- `id`: 唯一标识符
- `providerId`: 所属提供商 ID
- `name`: 模型名称（唯一，与 providerId 组合）
- `displayName`: 显示名称
- `description`: 模型描述
- `type`: 模型类型（"llm" | "video" | "image" | "tts"）
- `category`: 分类
- `isActive`: 是否启用
- `requiresKey`: 是否需要 API 密钥

## API 端点

### 1. 获取配置选项（用于项目创建）

**GET** `/api/ai-models/config-options`

获取所有可用的模型，按类型分组，用于项目创建时的下拉选项。

**响应示例：**

```json
{
  "success": true,
  "message": "Config options retrieved successfully",
  "data": {
    "llm": [
      {
        "id": "model-uuid-1",
        "name": "deepseek-chat",
        "displayName": "DeepSeek Chat",
        "description": "DeepSeek 对话模型",
        "provider": {
          "id": "provider-uuid-1",
          "name": "deepseek",
          "displayName": "DeepSeek",
          "logoUrl": null
        },
        "requiresKey": true
      }
    ],
    "video": [
      {
        "id": "model-uuid-2",
        "name": "sora",
        "displayName": "Sora",
        "description": "OpenAI 视频生成模型",
        "provider": {
          "id": "provider-uuid-2",
          "name": "openai",
          "displayName": "OpenAI",
          "logoUrl": null
        },
        "requiresKey": true
      }
    ],
    "image": [
      {
        "id": "model-uuid-3",
        "name": "stable-diffusion-xl",
        "displayName": "Stable Diffusion XL",
        "description": "Stability AI Stable Diffusion XL 模型",
        "provider": {
          "id": "provider-uuid-3",
          "name": "stability-ai",
          "displayName": "Stability AI",
          "logoUrl": null
        },
        "requiresKey": true
      }
    ],
    "tts": [
      {
        "id": "model-uuid-4",
        "name": "tts-1",
        "displayName": "OpenAI TTS",
        "description": "OpenAI 文本转语音模型",
        "provider": {
          "id": "provider-uuid-2",
          "name": "openai",
          "displayName": "OpenAI",
          "logoUrl": null
        },
        "requiresKey": true
      }
    ]
  }
}
```

### 2. 获取所有提供商

**GET** `/api/ai-models/providers`

获取所有启用的 AI 提供商及其模型。

**响应示例：**

```json
{
  "success": true,
  "message": "Providers retrieved successfully",
  "data": [
    {
      "id": "provider-uuid-1",
      "name": "deepseek",
      "displayName": "DeepSeek",
      "description": "DeepSeek AI - 专注于大语言模型",
      "website": "https://www.deepseek.com",
      "logoUrl": null,
      "isActive": true,
      "models": [
        {
          "id": "model-uuid-1",
          "name": "deepseek-chat",
          "displayName": "DeepSeek Chat",
          "type": "llm",
          "requiresKey": true
        }
      ]
    }
  ]
}
```

### 3. 按类型获取模型

**GET** `/api/ai-models/type/:type`

获取指定类型的所有模型。类型可以是：`llm`、`video`、`image`、`tts`。

**示例：**

```bash
GET /api/ai-models/type/llm
GET /api/ai-models/type/video
GET /api/ai-models/type/image
GET /api/ai-models/type/tts
```

### 4. 获取所有模型（按类型分组）

**GET** `/api/ai-models/grouped`

获取所有启用的模型，按类型分组。

### 5. 获取单个模型详情

**GET** `/api/ai-models/:id`

根据模型 ID 获取模型详细信息。

## 在项目创建中使用

### 前端使用示例

```javascript
// 1. 获取配置选项
const response = await fetch('/api/ai-models/config-options');
const { data } = await response.json();

// 2. 填充下拉选项
const llmOptions = data.llm.map(model => ({
  value: model.id,
  label: model.displayName,
  provider: model.provider.displayName,
  requiresKey: model.requiresKey
}));

// 3. 用户选择后，创建项目时使用模型 ID
const projectData = {
  title: "我的项目",
  storageLocation: "local",
  configLLM: data.llm[0].id, // 使用模型 ID
  configLLMKey: "sk-xxxxxxxxxxxxx", // 如果 requiresKey 为 true，必须提供
  configVideoAI: data.video[0].id,
  configVideoAIKey: "video-key-xxxxx",
  // ...
};
```

## 初始化数据

运行种子脚本填充初始数据：

```bash
npm run prisma:seed
```

种子脚本会创建以下数据：
- **提供商**: DeepSeek, OpenAI, Stability AI, Anthropic
- **LLM 模型**: DeepSeek Chat, GPT-4, GPT-3.5 Turbo, Claude 3 Opus
- **视频模型**: Sora
- **图片模型**: Stable Diffusion XL, DALL-E 3
- **TTS 模型**: OpenAI TTS

## 数据库迁移

创建并应用迁移：

```bash
npm run prisma:migrate
```

迁移名称建议：`add_ai_providers_and_models`

## 注意事项

1. 所有 API 端点都是公开的（不需要认证），可以根据需要添加认证
2. 模型 ID 是唯一标识符，在创建项目时使用
3. `requiresKey` 字段表示该模型是否需要 API 密钥
4. 只有 `isActive: true` 的模型和提供商才会在 API 中返回
5. 可以通过 Prisma Studio 管理提供商和模型数据

