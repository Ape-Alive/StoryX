# 角色与项目关联功能说明

## 概述

角色表（Character）现在可以与项目表（Project）建立关联关系。角色可以是：
- **项目专属角色**：只属于某个特定项目
- **全局角色**：属于用户，所有项目都可以使用（projectId 为 null）

## 数据库变更

### Character 模型新增字段

- `projectId` (String?, 可选)：关联的项目ID
  - 如果为 `null`：表示全局角色，所有项目都可以使用
  - 如果有值：表示项目专属角色，只属于该特定项目

### 关系说明

- 一个项目可以有多个角色
- 一个角色只能属于一个项目（或全局）
- 删除项目时，关联的角色也会被删除（CASCADE）

### 唯一性约束

- 同一用户在同一项目下，角色名必须唯一
- 如果 `projectId` 为 `null`，则全局角色名在该用户下唯一
- 约束：`@@unique([userId, name, projectId])`

## API 变更

### 1. 创建角色

**接口**: `POST /api/characters`

**请求体**（新增字段）:
```json
{
  "name": "角色名称",
  "projectId": "项目ID（可选）",  // 新增：如果提供则角色属于该项目
  // ... 其他字段
}
```

**说明**:
- 如果提供 `projectId`，会验证项目是否属于当前用户
- 如果不提供 `projectId`，创建的是全局角色

### 2. 获取角色列表

**接口**: `GET /api/characters`

**查询参数**（新增）:
- `projectId` (可选): 如果提供，只返回该项目和全局角色

**示例**:
```
GET /api/characters?projectId=xxx
```

### 3. 获取项目的所有角色

**接口**: `GET /api/projects/:id/characters` (新增)

**说明**:
- 返回指定项目的所有角色
- 包括项目专属角色和全局角色（projectId 为 null）

### 4. 更新角色

**接口**: `PUT /api/characters/:id`

**请求体**（新增字段）:
```json
{
  "projectId": "项目ID（可选）",  // 可以更新角色的项目关联
  // ... 其他字段
}
```

## 使用场景

### 场景 1: 创建全局角色

```json
POST /api/characters
{
  "name": "通用主角",
  "description": "可以在所有项目中使用的角色"
  // 不提供 projectId
}
```

### 场景 2: 创建项目专属角色

```json
POST /api/characters
{
  "name": "项目A的主角",
  "description": "只属于项目A的角色",
  "projectId": "项目A的ID"
}
```

### 场景 3: 获取项目的所有可用角色

```bash
GET /api/projects/{projectId}/characters
```

返回结果包括：
- 该项目专属的角色
- 全局角色（所有项目共享）

## 数据迁移

已自动创建并应用迁移：`20251129071920_add_project_to_character`

**注意**：
- 现有的角色数据，`projectId` 字段会被设置为 `null`（全局角色）
- 不会丢失任何现有数据

## 代码变更

### 服务层 (`services/characterService.js`)

1. **`createCharacter`**: 支持 `projectId` 参数，验证项目归属
2. **`getUserCharacters`**: 支持 `projectId` 查询参数
3. **`getProjectCharacters`**: 新增方法，获取项目的所有角色
4. **`updateCharacter`**: 支持更新 `projectId`

### 控制器层 (`controllers/characterController.js`)

1. **`getCharacters`**: 支持 `projectId` 查询参数
2. **`getProjectCharacters`**: 新增方法

### 路由层

1. **`/api/characters`**: 支持 `projectId` 查询参数
2. **`/api/projects/:id/characters`**: 新增路由

## 注意事项

1. **权限验证**：
   - 创建角色时，如果提供 `projectId`，会验证项目是否属于当前用户
   - 更新角色时，如果更新 `projectId`，也会验证项目归属

2. **数据一致性**：
   - 删除项目时，关联的角色会自动删除（CASCADE）
   - 角色必须属于创建它的用户

3. **查询逻辑**：
   - 获取项目角色时，会返回项目专属角色 + 全局角色
   - 这样可以确保项目可以使用所有可用的角色

## 示例

### 创建全局角色
```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "通用角色",
    "description": "所有项目可用"
  }'
```

### 创建项目专属角色
```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "项目专属角色",
    "description": "只属于这个项目",
    "projectId": "项目ID"
  }'
```

### 获取项目的所有角色
```bash
curl -X GET http://localhost:3000/api/projects/{projectId}/characters \
  -H "Authorization: Bearer TOKEN"
```

