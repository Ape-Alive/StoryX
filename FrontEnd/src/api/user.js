import request from '@/utils/request'

/**
 * 用户相关 API
 */

/**
 * 登录
 * @param {object} data 登录数据 { email, password }
 */
export function login(data) {
    return request.post('/auth/login', data)
}

/**
 * 退出登录
 */
export function logout() {
    return request.post('/user/logout')
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
    return request.get('/user/info')
}

/**
 * 更新用户信息
 * @param {object} data 用户信息
 */
export function updateUserInfo(data) {
    return request.put('/user/info', data)
}

