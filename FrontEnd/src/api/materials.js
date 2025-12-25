import request from '@/utils/request'

/**
 * 素材相关 API
 */

/**
 * 读取本地文件信息
 * @param {string} filePath 本地文件路径（绝对路径或相对路径）
 */
export function readFileInfo(filePath) {
    return request.post('/materials/read-file-info', { filePath })
}

