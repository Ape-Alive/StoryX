import request from '@/utils/request'

/**
 * 音视频模块相关 API
 */

/**
 * 获取当前项目下指定小说的所有剧幕（包含场景、镜头等信息）
 * @param {string} projectId 项目ID
 * @param {string} novelId 小说ID
 */
export function getActs(projectId, novelId) {
    return request.get(`/media/projects/${projectId}/novels/${novelId}/acts`)
}

/**
 * 按剧幕依次生成镜头视频
 * @param {string} projectId 项目ID
 * @param {string} novelId 小说ID
 * @param {object} data 生成配置 { actIds?, concurrency?, apiConfig?, allowOverwrite?, storageMode?, featurePromptId? }
 */
export function generateShotsByActs(projectId, novelId, data = {}) {
    return request.post(`/media/projects/${projectId}/novels/${novelId}/generate-shots`, data)
}

/**
 * 生成指定单个镜头视频
 * @param {string} projectId 项目ID
 * @param {object} data 生成配置 { shotIds, concurrency?, apiConfig?, allowOverwrite?, keepBoth?, storageMode?, featurePromptId?, mergeShots?, maxDuration?, toleranceSec? }
 * @param {string} novelId 小说ID（可选，用于验证镜头是否属于该小说）
 */
export function generateShots(projectId, data, novelId = null) {
    const params = novelId ? { novelId } : {}
    return request.post(`/media/projects/${projectId}/shots/generate`, data, { params })
}

/**
 * 在指定剧幕中新增镜头
 * @param {string} projectId 项目ID
 * @param {string} actId 剧幕ID
 * @param {object} data 镜头数据
 */
export function createShot(projectId, actId, data) {
    return request.post(`/media/projects/${projectId}/acts/${actId}/shots`, data)
}

/**
 * 修改镜头
 * @param {string} projectId 项目ID
 * @param {string} shotId 镜头ID
 * @param {object} data 镜头数据
 */
export function updateShot(projectId, shotId, data) {
    return request.put(`/media/projects/${projectId}/shots/${shotId}`, data)
}

/**
 * 删除镜头（支持批量删除）
 * @param {string} projectId 项目ID
 * @param {object} params 删除参数 { shotIds: string[] }
 */
export function deleteShots(projectId, params) {
    return request.delete(`/media/projects/${projectId}/shots`, { params })
}

/**
 * 生成台词音频
 * @param {string} projectId 项目ID
 * @param {object} data 生成配置 { dialogueIds, concurrency?, apiConfig?, storageMode?, featurePromptId? }
 */
export function generateDialogueAudio(projectId, data) {
    return request.post(`/media/projects/${projectId}/dialogues/generate-audio`, data)
}

/**
 * 修改台词内容
 * @param {string} projectId 项目ID
 * @param {string} dialogueId 台词ID
 * @param {object} data 台词数据
 */
export function updateDialogue(projectId, dialogueId, data) {
    return request.put(`/media/projects/${projectId}/dialogues/${dialogueId}`, data)
}

/**
 * 删除台词内容
 * @param {string} projectId 项目ID
 * @param {string} dialogueId 台词ID
 */
export function deleteDialogue(projectId, dialogueId) {
    return request.delete(`/media/projects/${projectId}/dialogues/${dialogueId}`)
}

/**
 * 预览视频
 * @param {string} projectId 项目ID
 * @param {object} params 预览参数 { type: 'act' | 'shot', actId?, shotId? }
 */
export function previewVideo(projectId, params) {
    return request.get(`/media/projects/${projectId}/preview/video`, { params })
}

/**
 * 预览带台词音频的视频
 * @param {string} projectId 项目ID
 * @param {object} params 预览参数
 */
export function previewVideoWithAudio(projectId, params) {
    return request.get(`/media/projects/${projectId}/preview/video-with-audio`, { params })
}

/**
 * 导出按幕导出视频
 * @param {string} projectId 项目ID
 * @param {object} data 导出配置
 */
export function exportActs(projectId, data) {
    return request.post(`/media/projects/${projectId}/export/acts`, data)
}

/**
 * 导出单个视频或音频
 * @param {string} projectId 项目ID
 * @param {object} data 导出配置
 */
export function exportSingle(projectId, data) {
    return request.post(`/media/projects/${projectId}/export/single`, data)
}

/**
 * 查询镜头视频生成任务进度
 * @param {string} taskId 任务ID
 */
export function getTaskProgress(taskId) {
    return request.get(`/media/tasks/${taskId}`)
}

/**
 * 查询剧幕下的所有镜头视频生成任务
 * @param {string} actId 剧幕ID
 * @param {string} status 任务状态过滤（可选）
 */
export function getActTasks(actId, status = null) {
    const params = status ? { status } : {}
    return request.get(`/media/acts/${actId}/tasks`, { params })
}

/**
 * 查询项目/小说下的所有镜头视频生成任务
 * @param {string} projectId 项目ID
 * @param {string} novelId 小说ID（可选）
 * @param {string} status 任务状态过滤（可选）
 */
export function getProjectTasks(projectId, novelId = null, status = null) {
    const params = {}
    if (novelId) params.novelId = novelId
    if (status) params.status = status
    return request.get(`/media/projects/${projectId}/tasks`, { params })
}

