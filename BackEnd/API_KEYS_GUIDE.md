# API 密钥配置指南

## 概述

项目配置中的每个 AI 服务都可以配置对应的 API 密钥。所有密钥在存储时都会进行加密处理，确保安全性。

## 配置字段说明

### LLM 配置
- **configLLM**: LLM AI 服务选择（默认: "deepseek"）
- **configLLMKey**: LLM API 密钥（可选，加密存储）

### 视频 AI 配置
- **configVideoAI**: 视频 AI 服务选择（默认: "default"）
- **configVideoAIKey**: 视频 AI API 密钥（可选，加密存储）

### 声音合成配置
- **configTTS**: 声音合成服务选择（默认: "default"）
- **configTTSKey**: TTS API 密钥（可选，加密存储）

### 图片生成配置
- **configImageGen**: 图片生成服务选择（默认: "default"）
- **configImageGenKey**: 图片生成 API 密钥（可选，加密存储）

## 安全特性

1. **加密存储**: 所有 API 密钥在存储到数据库前都会使用 AES-256-CBC 加密
2. **不返回密钥**: 所有查询接口都不会返回密钥字段，确保密钥不会泄露
3. **内部解密**: 只有在内部使用密钥时才会解密（通过 `getProjectWithKeys` 方法）

## 环境变量配置

在 `.env` 文件中配置加密密钥：

```env
ENCRYPTION_KEY=your-encryption-key-change-in-production
```

**重要**:
- 生产环境必须设置此密钥
- 建议使用 32 字节的随机字符串
- 一旦设置，不要随意更改，否则已加密的密钥将无法解密

## API 使用示例

### 创建项目时配置密钥

```json
{
  "title": "我的项目",
  "storageLocation": "local",
  "configLLM": "deepseek",
  "configLLMKey": "sk-xxxxxxxxxxxxx",
  "configVideoAI": "custom-video-ai",
  "configVideoAIKey": "video-api-key-xxxxx",
  "configTTS": "custom-tts",
  "configTTSKey": "tts-api-key-xxxxx",
  "configImageGen": "stable-diffusion",
  "configImageGenKey": "sd-api-key-xxxxx"
}
```

### 更新项目密钥

```bash
PUT /api/projects/:id
```

```json
{
  "configLLMKey": "new-api-key-xxxxx"
}
```

### 获取项目（不包含密钥）

```bash
GET /api/projects/:id
```

响应中不会包含任何密钥字段。

## 内部使用密钥

如果需要在服务内部使用密钥（例如调用 AI API），使用 `getProjectWithKeys` 方法：

```javascript
const projectService = require('./services/projectService');

// 获取包含解密密钥的项目
const project = await projectService.getProjectWithKeys(projectId, userId);

// 使用密钥
const apiKey = project.configLLMKey; // 已解密
```

## 密钥验证规则

- **必填规则**: 如果配置了服务（configLLM、configVideoAI、configTTS、configImageGen），对应的密钥（configLLMKey、configVideoAIKey、configTTSKey、configImageGenKey）**必须提供**
- 密钥会在存储时自动加密
- 密钥在返回时自动过滤，不会泄露

### 验证示例

**正确示例**：
```json
{
  "title": "我的项目",
  "storageLocation": "local",
  "configLLM": "deepseek",
  "configLLMKey": "sk-xxxxxxxxxxxxx"  // ✅ 配置了 configLLM，必须提供密钥
}
```

**错误示例**：
```json
{
  "title": "我的项目",
  "storageLocation": "local",
  "configLLM": "deepseek"
  // ❌ 配置了 configLLM 但没有提供 configLLMKey，会返回 400 错误
}
```

**可以不配置服务**：
```json
{
  "title": "我的项目",
  "storageLocation": "local"
  // ✅ 不配置任何服务，密钥也不需要提供
}
```

## 注意事项

1. **密钥安全**:
   - 不要在日志中记录密钥
   - 不要在错误信息中暴露密钥
   - 使用 HTTPS 传输密钥

2. **加密密钥管理**:
   - 生产环境必须设置 `ENCRYPTION_KEY`
   - 定期轮换加密密钥（需要重新加密所有数据）
   - 备份加密密钥到安全位置

3. **密钥更新**:
   - 更新密钥时，只需提供新的密钥值
   - 系统会自动加密并存储
   - 旧密钥会被覆盖

