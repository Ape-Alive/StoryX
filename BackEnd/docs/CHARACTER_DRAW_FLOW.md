# 角色抽卡（Draw Card）流程文档

## 概述

角色抽卡功能用于批量生成角色的图片或视频（2 秒），支持单独抽卡。系统会异步处理任务，支持并发控制，并实时更新进度。

## 数据库表结构

### CharacterDrawTask（抽卡任务表）

- `id`: 任务 ID（UUID）
- `userId`: 用户 ID
- `projectId`: 项目 ID
- `characterIds`: 角色 ID 数组（JSON 字符串）
- `drawType`: 抽卡类型（'image' | 'video' | 'both'）
- `modelId`: 使用的模型 ID（可选）
- `config`: 任务配置（JSON 字符串，包含并发数等）
- `status`: 任务状态（'pending' | 'processing' | 'completed' | 'failed'）
- `progress`: 进度（0-100）
- `totalCount`: 总任务数
- `completedCount`: 已完成数
- `failedCount`: 失败数
- `errorMessage`: 错误信息
- `startedAt`: 开始时间
- `completedAt`: 完成时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### CharacterDrawResult（抽卡结果表）

- `id`: 结果 ID（UUID）
- `taskId`: 关联的任务 ID
- `characterId`: 角色 ID
- `userId`: 用户 ID
- `projectId`: 项目 ID
- `resultType`: 结果类型（'image' | 'video'）
- `fileUrl`: 文件 URL
- `filePath`: 本地文件路径
- `thumbnailUrl`: 缩略图 URL（视频用）
- `status`: 状态（'pending' | 'processing' | 'completed' | 'failed'）
- `progress`: 进度（0-100）
- `errorMessage`: 错误信息
- `metadata`: 元数据（JSON 字符串）
- `startedAt`: 开始时间
- `completedAt`: 完成时间
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 完整流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. 用户发起抽卡请求                            │
│              POST /api/characters/draw                           │
│  参数: characterIds[], projectId, drawType, modelId, config     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│             2. Controller 层验证和参数处理                        │
│  characterDrawController.startBatchDraw()                       │
│  - 验证 characterIds 数组非空                                    │
│  - 验证 projectId 存在                                           │
│  - 提取 userId (从 JWT token)                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│          3. Service 层：startBatchDraw()                        │
│  characterDrawService.startBatchDraw()                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.1 验证项目属于用户                                       │  │
│  │    - 查询 Project 表                                       │  │
│  │    - WHERE id = projectId AND userId = userId            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.2 验证角色属于用户                                       │  │
│  │    - 查询 Character 表                                    │  │
│  │    - WHERE id IN characterIds AND userId = userId        │  │
│  │    - 验证返回数量 = 请求数量                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.3 解析配置选项                                           │  │
│  │    - drawType: 'image' | 'video' | 'both' (默认: 'image')│  │
│  │    - modelId: 可选，如果提供则使用指定模型                 │  │
│  │    - config: 额外配置（尺寸、时长等）                      │  │
│  │    - concurrency: 并发数（默认3，范围1-100）               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.4 获取模型配置                                           │  │
│  │                                                           │  │
│  │  如果 modelId 提供:                                       │  │
│  │    - 查询 AIModel 表获取模型信息                          │  │
│  │    - 根据模型类型（image/video）从项目获取对应API密钥     │  │
│  │    - 解密 API 密钥                                        │  │
│  │    - 构建 modelConfig {modelId, apiKey, baseUrl, provider}│ │
│  │                                                           │  │
│  │  如果 modelId 未提供（使用项目配置）:                     │  │
│  │    - 根据 drawType 从项目获取对应模型ID                    │  │
│  │      * image/both → project.configImageGen                │  │
│  │      * video → project.configVideoAI                      │  │
│  │    - 查询 AIModel 表获取模型信息                          │  │
│  │    - 从项目获取对应API密钥并解密                          │  │
│  │    - 构建 modelConfig                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.5 计算总任务数                                           │  │
│  │    - drawType = 'image' → totalCount = characterIds.length│ │
│  │    - drawType = 'video' → totalCount = characterIds.length│ │
│  │    - drawType = 'both' → totalCount = characterIds.length*2│ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.6 创建 CharacterDrawTask 记录                           │  │
│  │    INSERT INTO CharacterDrawTask                          │  │
│  │    - characterIds: JSON.stringify(characterIds)          │  │
│  │    - drawType, modelId, config (包含并发数)                │  │
│  │    - status: 'pending'                                    │  │
│  │    - progress: 0                                          │  │
│  │    - totalCount, completedCount: 0, failedCount: 0        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.7 创建 CharacterDrawResult 记录                         │  │
│  │    - 遍历每个 characterId                                │  │
│  │    - 如果 drawType = 'image' 或 'both':                   │  │
│  │       创建一条 resultType='image' 的记录                  │  │
│  │    - 如果 drawType = 'video' 或 'both':                   │  │
│  │       创建一条 resultType='video' 的记录                  │  │
│  │    - 批量插入 CharacterDrawResult                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.8 异步启动任务处理                                       │  │
│  │    processDrawTask(taskId, modelConfig, config)         │  │
│  │    .catch() - 捕获错误但不阻塞响应                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3.9 返回任务信息                                           │  │
│  │    { taskId, totalCount, status: 'pending' }              │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│             4. 异步处理任务：processDrawTask()                   │
│  characterDrawService.processDrawTask()                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4.1 更新任务状态为 'processing'                           │  │
│  │    UPDATE CharacterDrawTask                              │  │
│  │    SET status = 'processing', startedAt = NOW()          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4.2 获取任务信息                                          │  │
│  │    SELECT * FROM CharacterDrawTask WHERE id = taskId     │  │
│  │    - 解析 characterIds (JSON)                            │  │
│  │    - 解析 config (JSON，获取并发数)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4.3 获取所有待处理的结果                                   │  │
│  │    SELECT * FROM CharacterDrawResult                     │  │
│  │    WHERE taskId = taskId AND status = 'pending'          │  │
│  │    INCLUDE character (关联角色信息)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4.4 并发处理结果（分批处理）                               │  │
│  │    - 从 config 获取并发数 concurrency (默认3)              │  │
│  │    - 将 results 数组分批，每批 concurrency 个             │  │
│  │    - 对每批使用 Promise.all() 并发处理                    │  │
│  │    - 调用 processDrawResult() 处理每个结果                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4.5 更新任务最终状态                                       │  │
│  │    - 统计 completedCount (status='completed')             │  │
│  │    - 统计 failedCount (status='failed')                   │  │
│  │    - 计算 progress = (completedCount / totalCount) * 100  │  │
│  │    - 更新任务状态:                                         │  │
│  │      * completedCount === totalCount → 'completed'        │  │
│  │      * failedCount === totalCount → 'failed'               │  │
│  │      * 否则 → 'processing'                                 │  │
│  │    - 如果完成，设置 completedAt = NOW()                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│        5. 处理单个结果：processDrawResult()                      │
│  characterDrawService.processDrawResult()                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5.1 更新结果状态为 'processing'                           │  │
│  │    UPDATE CharacterDrawResult                            │  │
│  │    SET status = 'processing', progress = 10,              │  │
│  │        startedAt = NOW()                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5.2 调用 AI 生成服务                                       │  │
│  │                                                           │  │
│  │  如果 resultType = 'image':                              │  │
│  │    imageGenerationService.generateCharacterImage()      │  │
│  │    - 获取系统提示词（character_image_generation）         │  │
│  │    - 构建图片提示词（角色信息 + 风格 + 系统提示词）        │  │
│  │    - 根据 providerName 调用对应API:                      │  │
│  │      * Stability AI → callStabilityAI()                  │  │
│  │      * OpenAI → callOpenAIDalle()                        │  │
│  │      * Midjourney → callMidjourney()                     │  │
│  │    - 保存图片文件到本地                                    │  │
│  │    - 返回 { imageUrl, filePath, metadata }               │  │
│  │                                                           │  │
│  │  如果 resultType = 'video':                              │  │
│  │    imageGenerationService.generateCharacterVideo()       │  │
│  │    - 获取系统提示词（character_video_generation）         │  │
│  │    - 构建视频提示词（角色信息 + 风格 + 时长 + 系统提示词） │  │
│  │    - 根据 providerName 调用对应API:                     │  │
│  │      * OpenAI Sora → callOpenAISora()                    │  │
│  │      * Runway → callRunway()                             │  │
│  │      * Pika → callPika()                                 │  │
│  │    - 保存视频文件到本地                                    │  │
│  │    - 生成缩略图（可选）                                    │  │
│  │    - 返回 { videoUrl, filePath, thumbnailUrl, metadata } │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5.3 更新结果记录                                          │  │
│  │    UPDATE CharacterDrawResult                            │  │
│  │    SET status = 'completed', progress = 100,             │  │
│  │        fileUrl = generatedData.imageUrl/videoUrl,        │  │
│  │        filePath = generatedData.filePath,                │  │
│  │        thumbnailUrl = generatedData.thumbnailUrl,        │  │
│  │        metadata = JSON.stringify(metadata),              │  │
│  │        completedAt = NOW()                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5.4 更新角色记录                                          │  │
│  │                                                           │  │
│  │  如果 resultType = 'image' 且生成成功:                   │  │
│  │    UPDATE Character                                     │  │
│  │    SET imageUrl = generatedData.imageUrl                 │  │
│  │    WHERE id = characterId                                │  │
│  │                                                           │  │
│  │  如果 resultType = 'video' 且生成成功:                   │  │
│  │    UPDATE Character                                     │  │
│  │    SET videoUrl = generatedData.videoUrl                 │  │
│  │    WHERE id = characterId                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5.5 错误处理                                              │  │
│  │    - 如果生成失败，捕获错误                                │  │
│  │    - UPDATE CharacterDrawResult                           │  │
│  │      SET status = 'failed',                              │  │
│  │          errorMessage = error.message,                   │  │
│  │          progress = 0                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│             6. 查询进度接口                                      │
│         GET /api/characters/draw/tasks/:taskId                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6.1 查询任务信息                                          │  │
│  │    SELECT * FROM CharacterDrawTask                      │  │
│  │    WHERE id = taskId AND userId = userId                │  │
│  │    INCLUDE results (关联所有结果)                        │  │
│  │    INCLUDE character (关联角色信息)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6.2 返回进度信息                                          │  │
│  │    {                                                      │  │
│  │      taskId, status, progress,                           │  │
│  │      totalCount, completedCount, failedCount,            │  │
│  │      errorMessage, startedAt, completedAt,              │  │
│  │      results: [                                          │  │
│  │        { id, characterId, characterName,                │  │
│  │          resultType, status, progress,                   │  │
│  │          fileUrl, thumbnailUrl, errorMessage, metadata } │  │
│  │      ]                                                    │  │
│  │    }                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

```

## 关键数据流

### 1. 任务创建流程

```
用户请求 → Controller → Service.startBatchDraw()
  ↓
验证项目/角色 → 获取模型配置 → 创建Task → 创建Results → 异步处理
  ↓
立即返回 taskId
```

### 2. 异步处理流程

```
processDrawTask() 启动
  ↓
更新Task状态为 'processing'
  ↓
获取所有待处理Results
  ↓
分批并发处理（每批 concurrency 个）
  ↓
processDrawResult() 处理每个结果
  ↓
调用AI API生成 → 保存文件 → 更新Result → 更新Character
  ↓
统计完成/失败数量 → 更新Task状态和进度
```

### 3. 数据库交互点

#### 读取操作：

- **Project 表**: 验证项目归属、获取模型配置、获取 API 密钥
- **Character 表**: 验证角色归属、更新图片/视频 URL
- **AIModel 表**: 获取模型信息（baseUrl、providerName 等）
- **CharacterDrawTask 表**: 查询任务状态、更新进度
- **CharacterDrawResult 表**: 查询待处理结果、更新结果状态

#### 写入操作：

- **CharacterDrawTask 表**:

  - 创建任务记录（status='pending'）
  - 更新状态为 'processing'
  - 更新进度、完成数、失败数
  - 更新最终状态（'completed'/'failed'）

- **CharacterDrawResult 表**:

  - 批量创建结果记录（status='pending'）
  - 更新状态为 'processing'
  - 更新完成信息（fileUrl、filePath、metadata 等）
  - 更新失败信息（errorMessage）

- **Character 表**:
  - 更新 imageUrl（图片生成成功）
  - 更新 videoUrl（视频生成成功）

## 并发控制

1. **任务级并发**: 通过 `concurrency` 参数控制同时处理的结果数量
2. **分批处理**: 将结果数组按并发数分批，每批使用 `Promise.all()` 并发执行
3. **默认并发数**: 3（可在请求中配置，范围 1-100）

## 错误处理

1. **任务级错误**: 如果整个任务处理失败，更新 Task 状态为 'failed'，记录错误信息
2. **结果级错误**: 单个结果失败不影响其他结果，更新 Result 状态为 'failed'，记录错误信息
3. **API 调用错误**: 在 `processDrawResult()` 中捕获，更新对应 Result 状态

## 文件存储

- **图片**: 保存到本地文件系统，路径格式：`storage/images/character_{characterId}_{timestamp}.png`
- **视频**: 保存到本地文件系统，路径格式：`storage/videos/character_{characterId}_{timestamp}.mp4`
- **缩略图**: 视频生成时可选生成缩略图

## 状态流转

### Task 状态：

```
pending → processing → completed/failed
```

### Result 状态：

```
pending → processing → completed/failed
```

## API 端点

1. **POST /api/characters/draw** - 启动抽卡任务
2. **GET /api/characters/draw/tasks/:taskId** - 查询任务进度
3. **GET /api/characters/:characterId/draw-results** - 获取角色的所有抽卡结果
4. **GET /api/characters/draw-results/:resultId/download** - 下载/预览生成的文件
