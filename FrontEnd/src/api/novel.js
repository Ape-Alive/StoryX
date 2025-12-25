import request from '@/utils/request'

/**
 * 小说相关 API
 */

/**
 * 获取当前用户的小说列表
 * @param {object} params 查询参数 { projectId?: string }
 */
export function getNovels(params = {}) {
    return request.get('/novels', params)
}

/**
 * 获取小说详情
 * @param {string} id 小说ID
 * @param {string} chapterId 章节ID（可选）
 */
export function getNovel(id, chapterId = null) {
    const params = chapterId ? { chapterId } : {}
    return request.get(`/novels/${id}`, params)
}

/**
 * 获取小说的章节列表
 * @param {string} id 小说ID
 */
export function getNovelChapters(id) {
    return request.get(`/novels/${id}/chapters`)
}

/**
 * 获取章节内容
 * @param {string} id 章节ID
 */
export function getChapter(id) {
    return request.get(`/chapters/${id}`)
}

/**
 * 上传并解析整本小说
 * @param {FormData} formData 包含 file, projectId, fileName?, encoding?, customTitle?
 */
export function uploadNovel(formData) {
    return request.post('/text/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

/**
 * 上传并解析文本粘贴片段
 * @param {object} data 文本数据
 */
export function pasteText(data) {
    return request.post('/text/paste', data)
}

/**
 * 删除整本小说
 * @param {string} id 小说ID
 */
export function deleteNovel(id) {
    return request.delete(`/novels/${id}`)
}

/**
 * 剧本结构化相关 API
 */

/**
 * 启动剧本生成
 * @param {string} novelId 小说ID
 * @param {object} data 生成配置
 */
export function generateScript(novelId, data) {
    return request.post(`/novels/${novelId}/script/generate`, data)
}

/**
 * 获取小说的所有剧本生成批次
 * @param {string} novelId 小说ID
 */
export function getScriptBatches(novelId) {
    return request.get(`/novels/${novelId}/script/batches`)
}

/**
 * 获取批次详情
 * @param {string} batchId 批次ID
 */
export function getBatchDetail(batchId) {
    return request.get(`/script/batches/${batchId}`)
}

/**
 * 获取小说的所有剧幕
 * @param {string} novelId 小说ID
 */
export function getNovelActs(novelId) {
    return request.get(`/novels/${novelId}/acts`)
}

/**
 * 获取小说的所有剧本生成任务
 * @param {string} novelId 小说ID
 */
export function getScriptTasks(novelId) {
    return request.get(`/novels/${novelId}/script/tasks`)
}

/**
 * 获取单个任务详情
 * @param {string} taskId 任务ID
 */
export function getTaskDetail(taskId) {
    return request.get(`/script/tasks/${taskId}`)
}

/**
 * 重新生成剧本数据结构
 * @param {string} taskId 任务ID
 * @param {object} data 重新生成配置
 */
export function regenerateScript(taskId, data) {
    return request.post(`/script/tasks/${taskId}/regenerate`, data)
}

