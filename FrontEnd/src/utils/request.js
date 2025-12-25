import axios from 'axios'
import env from '@/config/env'
import { getCookie, removeCookie, getLocalStorage, removeLocalStorage } from './storage'

/**
 * 创建 axios 实例
 */
const service = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
})

/**
 * 请求拦截器
 */
service.interceptors.request.use(
    config => {
        // 可以在这里添加 token
        const token = getCookie('token') || getLocalStorage('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => {
        console.error('请求错误:', error)
        return Promise.reject(error)
    }
)

/**
 * 响应拦截器
 */
service.interceptors.response.use(
    response => {
        const res = response.data

        // 根据后端返回的数据结构进行判断
        // 如果返回 success 为 false，则视为错误
        if (res.success === false) {
            return Promise.reject(new Error(res.message || '请求失败'))
        }

        // 如果后端返回的 code 不是 200，则视为错误（兼容其他接口）
        if (res.code !== undefined && res.code !== 200) {
            // 可以在这里处理特定的错误码
            if (res.code === 401) {
                // token 过期，清除本地存储并跳转登录
                removeLocalStorage('token')
                removeCookie('token')
                // window.location.href = '/login'
            }
            return Promise.reject(new Error(res.message || '请求失败'))
        }

        return res
    },
    error => {
        console.error('响应错误:', error)
        const { response } = error

        if (response) {
            switch (response.status) {
                case 401:
                    // 未授权，清除 token 并跳转登录
                    removeLocalStorage('token')
                    removeCookie('token')
                    // window.location.href = '/login'
                    break
                case 403:
                    return Promise.reject(new Error('没有权限访问'))
                case 404:
                    return Promise.reject(new Error('请求的资源不存在'))
                case 500:
                    return Promise.reject(new Error('服务器错误'))
                default:
                    return Promise.reject(new Error(response.data?.message || '请求失败'))
            }
        }

        return Promise.reject(error)
    }
)


/**
 * 封装的请求方法
 */
const request = {
    /**
     * GET 请求
     * @param {string} url 请求地址
     * @param {object} params 请求参数
     * @param {object} config axios 配置
     */
    get(url, params = {}, config = {}) {
        return service({
            method: 'get',
            url,
            params,
            ...config
        })
    },

    /**
     * POST 请求
     * @param {string} url 请求地址
     * @param {object} data 请求数据
     * @param {object} config axios 配置
     */
    post(url, data = {}, config = {}) {
        return service({
            method: 'post',
            url,
            data,
            ...config
        })
    },

    /**
     * PUT 请求
     * @param {string} url 请求地址
     * @param {object} data 请求数据
     * @param {object} config axios 配置
     */
    put(url, data = {}, config = {}) {
        return service({
            method: 'put',
            url,
            data,
            ...config
        })
    },

    /**
     * DELETE 请求
     * @param {string} url 请求地址
     * @param {object} params 请求参数
     * @param {object} config axios 配置
     */
    delete(url, params = {}, config = {}) {
        return service({
            method: 'delete',
            url,
            params,
            ...config
        })
    },

    /**
     * PATCH 请求
     * @param {string} url 请求地址
     * @param {object} data 请求数据
     * @param {object} config axios 配置
     */
    patch(url, data = {}, config = {}) {
        return service({
            method: 'patch',
            url,
            data,
            ...config
        })
    }
}

export default request

