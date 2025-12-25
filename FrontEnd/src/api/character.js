import request from '@/utils/request'

/**
 * 角色相关 API
 */

/**
 * 获取当前用户的所有角色
 * @param {object} params 查询参数 { cached?: boolean, projectId?: string, novelId?: string }
 */
export function getCharacters(params = {}) {
  return request.get('/characters', params)
}

/**
 * 创建新角色
 * @param {object} data 角色数据
 */
export function createCharacter(data) {
  return request.post('/characters', data)
}

/**
 * 获取角色详情
 * @param {string} id 角色ID
 * @param {string} novelId 小说ID（可选）
 */
export function getCharacter(id, novelId = null) {
  const params = novelId ? { novelId } : {}
  return request.get(`/characters/${id}`, params)
}

/**
 * 更新角色
 * @param {string} id 角色ID
 * @param {object} data 角色数据
 * @param {string} novelId 小说ID（可选）
 */
export function updateCharacter(id, data, novelId = null) {
  const params = novelId ? { novelId } : {}
  return request.put(`/characters/${id}`, data, { params })
}

/**
 * 删除角色
 * @param {string} id 角色ID
 * @param {string} novelId 小说ID（可选）
 */
export function deleteCharacter(id, novelId = null) {
  const params = novelId ? { novelId } : {}
  return request.delete(`/characters/${id}`, params)
}

/**
 * 自动合并重复角色
 * @param {object} params 查询参数 { projectId?: string, novelId?: string }
 */
export function mergeCharacters(params = {}) {
  return request.post('/characters/merge', params)
}

/**
 * 批量抽卡（每个角色创建一个任务）
 * @param {object} data 抽卡数据 { characterIds: string[], projectId: string, drawType?: 'image' | 'video', apiConfig?: object, storageMode?: string, featurePromptId?: string, genreStyle?: string }
 */
export function batchDrawCharacters(data) {
  return request.post('/characters/draw', data)
}

/**
 * 查询抽卡进度
 * @param {string} taskId 任务ID
 */
export function getDrawTaskProgress(taskId) {
  return request.get(`/characters/draw/tasks/${taskId}`)
}

/**
 * 获取角色的图片或视频列表
 * @param {string} characterId 角色ID
 * @param {string} type 结果类型过滤（可选）'image' | 'video'
 */
export function getCharacterDrawResults(characterId, type = null) {
  const params = type ? { type } : {}
  return request.get(`/characters/${characterId}/draw-results`, params)
}

/**
 * 获取角色的所有抽卡任务
 * @param {string} characterId 角色ID
 * @param {string} type 任务类型过滤（可选）'image' | 'video'
 */
export function getCharacterDrawTasks(characterId, type = null) {
  const params = type ? { type } : {}
  return request.get(`/characters/${characterId}/draw-tasks`, params)
}

