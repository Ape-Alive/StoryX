# /api/media/projects/{projectId}/novels/{novelId}/generate-shots 接口示例

## 接口说明

按剧幕或场景生成镜头视频，支持合并模式和场景批次处理。

## 请求示例

### 1. 使用 sceneIds（场景 ID 列表）- 不合并模式

```json
POST /api/media/projects/123e4567-e89b-12d3-a456-426614174000/novels/223e4567-e89b-12d3-a456-426614174001/generate-shots

{
  "sceneIds": [
    "scene-001",
    "scene-002",
    "scene-003"
  ],
  "concurrency": 3,
  "allowOverwrite": false,
  "keepBoth": false,
  "storageMode": "download_upload",
  "featurePromptId": null,
  "mergeShots": false
}
```

**说明：**

- `sceneIds` 优先于 `actIds`（如果同时传入，使用 `sceneIds`）
- 每个 `sceneId` 的所有镜头作为一个批次
- 批次间并发执行，批次内按顺序执行
- 不合并模式：每个镜头单独生成视频

### 2. 使用 sceneIds + 合并模式

```json
POST /api/media/projects/123e4567-e89b-12d3-a456-426614174000/novels/223e4567-e89b-12d3-a456-426614174001/generate-shots

{
  "sceneIds": [
    "scene-001",
    "scene-002"
  ],
  "concurrency": 3,
  "allowOverwrite": false,
  "keepBoth": false,
  "storageMode": "download_upload",
  "featurePromptId": "feature-prompt-001",
  "mergeShots": true,
  "maxDuration": 30,
  "toleranceSec": 5
}
```

**说明：**

- 合并模式：自动将相邻镜头合并生成视频
- 优先按 `sceneId` 分组，然后按时长分组
- 单个镜头超过 `maxDuration + toleranceSec` 时单独成组
- 同一 `sceneId` 的镜头优先分在一组
- 累计时长不超过 `maxDuration + toleranceSec`
- 累计时长达到 `maxDuration - toleranceSec` 后可切组

### 3. 使用 actIds（剧幕 ID 列表）- 原有逻辑

```json
POST /api/media/projects/123e4567-e89b-12d3-a456-426614174000/novels/223e4567-e89b-12d3-a456-426614174001/generate-shots

{
  "actIds": [
    "act-001",
    "act-002"
  ],
  "concurrency": 3,
  "allowOverwrite": false,
  "keepBoth": false,
  "storageMode": "download_upload",
  "featurePromptId": null,
  "mergeShots": false
}
```

**说明：**

- 如果只传入 `actIds`，使用原有逻辑
- 按 `concurrency` 分组批次

### 4. 同时传入 actIds 和 sceneIds（sceneIds 优先）

```json
POST /api/media/projects/123e4567-e89b-12d3-a456-426614174000/novels/223e4567-e89b-12d3-a456-426614174001/generate-shots

{
  "actIds": [
    "act-001"
  ],
  "sceneIds": [
    "scene-001",
    "scene-002"
  ],
  "concurrency": 3,
  "allowOverwrite": false,
  "keepBoth": false,
  "storageMode": "download_upload",
  "mergeShots": false
}
```

**说明：**

- `sceneIds` 优先，忽略 `actIds`
- 按 `sceneId` 分组批次

## 响应示例

### 成功响应（sceneIds 模式）

```json
{
  "success": true,
  "data": {
    "total": 15,
    "acts": [
      {
        "actId": "act-001",
        "actName": "第一幕",
        "order": 1,
        "startChapterOrder": 1,
        "taskIds": ["task-001", "task-002", "task-003"]
      },
      {
        "actId": "act-002",
        "actName": "第二幕",
        "order": 2,
        "startChapterOrder": 5,
        "taskIds": ["task-004", "task-005"]
      }
    ]
  },
  "message": "Shot generation started successfully",
  "statusCode": 201
}
```

### 成功响应（合并模式）

```json
{
  "success": true,
  "data": {
    "total": 8,
    "acts": [
      {
        "actId": "act-001",
        "actName": "第一幕",
        "order": 1,
        "startChapterOrder": 1,
        "taskIds": ["task-001", "task-002"]
      }
    ]
  },
  "message": "Shot generation started successfully",
  "statusCode": 201
}
```

**说明：**

- `total`: 镜头组数量（合并模式）或镜头数量（不合并模式）
- `acts`: 按剧幕组织的任务 ID 列表
- 每个 `taskId` 对应一个生成任务，可通过任务查询接口查询进度

### 全部跳过响应

```json
{
  "success": true,
  "data": {
    "total": 0,
    "acts": [],
    "message": "All shots already have videos. Set allowOverwrite=true to regenerate.",
    "skipped": 20
  },
  "message": "Shot generation started successfully",
  "statusCode": 201
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Some scenes not found or do not belong to project",
  "statusCode": 404
}
```

## 批次处理逻辑说明

### sceneIds 模式

- **批次分组**：每个 `sceneId` 的所有镜头组作为一个批次
- **并发控制**：批次间并发执行，批次内按顺序执行
- **示例**：
  - scene-001 有 5 个镜头 → 批次 1（5 个任务，顺序执行）
  - scene-002 有 3 个镜头 → 批次 2（3 个任务，顺序执行）
  - scene-003 有 7 个镜头 → 批次 3（7 个任务，顺序执行）
  - 批次 1、2、3 并发执行

### actIds 模式（原有逻辑）

- **批次分组**：按 `concurrency` 参数分组（默认 3）
- **并发控制**：批次间并发执行，批次内按顺序执行
- **示例**：
  - 15 个镜头，concurrency=3
  - 批次 1：镜头 1-3（顺序执行）
  - 批次 2：镜头 4-6（顺序执行）
  - 批次 3：镜头 7-9（顺序执行）
  - ...以此类推
  - 批次 1、2、3 并发执行

## 合并模式分组规则

### sceneIds 模式下的合并分组

1. **优先按 sceneId 分组**：同一 `sceneId` 的镜头优先分在一组
2. **按时长分组**：在同一个 `sceneId` 内，按时长规则分组
3. **分组规则**：
   - 单个镜头时长超过 `maxDuration + toleranceSec` → 单独成组
   - 累计时长不超过 `maxDuration + toleranceSec`
   - 累计时长达到 `maxDuration - toleranceSec` 后可切组（但允许继续添加直到上限）

### 示例

假设：

- `maxDuration = 30`
- `toleranceSec = 5`
- scene-001 有镜头：5s, 8s, 10s, 12s, 15s

分组结果：

- 组 1：5s + 8s + 10s = 23s（在 25-35s 范围内）
- 组 2：12s + 15s = 27s（在 25-35s 范围内）

## 参数说明

| 参数              | 类型          | 必填 | 说明                                             |
| ----------------- | ------------- | ---- | ------------------------------------------------ |
| `sceneIds`        | Array<string> | 否   | 场景 ID 列表，优先于 `actIds`                    |
| `actIds`          | Array<string> | 否   | 剧幕 ID 列表，如果 `sceneIds` 为空则使用         |
| `concurrency`     | number        | 否   | 并发数（默认 3），仅在 `actIds` 模式生效         |
| `allowOverwrite`  | boolean       | 否   | 是否覆盖已有视频（默认 false）                   |
| `keepBoth`        | boolean       | 否   | 是否保留旧版本（默认 false）                     |
| `storageMode`     | string        | 否   | 存储模式（默认"download_upload"）                |
| `featurePromptId` | string        | 否   | 功能提示词 ID                                    |
| `mergeShots`      | boolean       | 否   | 是否合并模式（默认 false）                       |
| `maxDuration`     | number        | 否   | 合并模式最大时长（秒），`mergeShots=true` 时必填 |
| `toleranceSec`    | number        | 否   | 合并模式时长容差（秒，默认 5）                   |
