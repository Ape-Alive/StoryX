import request from '@/utils/request'

/**
 * 系统提示词相关 API
 */

/**
 * 获取功能提示词列表（通过 functionKey）
 * @param {string} functionKey 系统提示词的功能标识（如：shot_video_generation）
 * @param {string} functionType 按功能类型筛选（可选）
 */
export function getFeaturePrompts(functionKey, functionType = null) {
  const params = { functionKey }
  if (functionType) {
    params.functionType = functionType
  }
  return request.get('/system-prompts/feature-prompts', params)
}

