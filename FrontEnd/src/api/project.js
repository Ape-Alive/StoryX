import request from '@/utils/request'

/**
 * 项目相关 API
 */

/**
 * 获取项目列表
 * @param {object} params 查询参数 { page, limit, status }
 */
export function getProjects(params = {}) {
  return request.get('/projects', params)
}

/**
 * 获取项目详情
 * @param {string} id 项目ID
 */
export function getProject(id) {
  return request.get(`/projects/${id}`)
}

/**
 * 创建项目
 * @param {object} data 项目数据
 */
export function createProject(data) {
  return request.post('/projects', data)
}

/**
 * 更新项目
 * @param {string} id 项目ID
 * @param {object} data 项目数据
 */
export function updateProject(id, data) {
  return request.put(`/projects/${id}`, data)
}

/**
 * 删除项目
 * @param {string} id 项目ID
 */
export function deleteProject(id) {
  return request.delete(`/projects/${id}`)
}

/**
 * 开始处理项目
 * @param {string} id 项目ID
 */
export function processProject(id) {
  return request.post(`/projects/${id}/process`)
}

/**
 * 获取项目的所有角色
 * @param {string} id 项目ID
 */
export function getProjectCharacters(id) {
  return request.get(`/projects/${id}/characters`)
}

/**
 * 获取项目的所有小说
 * @param {string} id 项目ID
 */
export function getProjectNovels(id) {
  return request.get(`/projects/${id}/novels`)
}

/**
 * 获取项目配置选项（AI模型配置）
 */
export function getConfigOptions() {
  return request.get('/ai-models/config-options')
}

