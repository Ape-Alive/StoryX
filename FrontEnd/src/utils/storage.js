/**
 * Cookie 操作工具
 */

/**
 * 设置 Cookie
 * @param {string} name Cookie 名称
 * @param {string} value Cookie 值
 * @param {number} days 过期天数
 * @param {string} path 路径，默认为 '/'
 * @param {string} domain 域名
 */
export function setCookie(name, value, days = 7, path = '/', domain = '') {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = `; expires=${date.toUTCString()}`
  }
  const domainStr = domain ? `; domain=${domain}` : ''
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}${domainStr}`
}

/**
 * 获取 Cookie
 * @param {string} name Cookie 名称
 * @returns {string|null} Cookie 值
 */
export function getCookie(name) {
  const nameEQ = `${name}=`
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length))
    }
  }
  return null
}

/**
 * 删除 Cookie
 * @param {string} name Cookie 名称
 * @param {string} path 路径，默认为 '/'
 * @param {string} domain 域名
 */
export function removeCookie(name, path = '/', domain = '') {
  setCookie(name, '', -1, path, domain)
}

/**
 * 检查 Cookie 是否存在
 * @param {string} name Cookie 名称
 * @returns {boolean}
 */
export function hasCookie(name) {
  return getCookie(name) !== null
}

/**
 * 获取所有 Cookie
 * @returns {object} Cookie 对象
 */
export function getAllCookies() {
  const cookies = {}
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    const c = ca[i].trim()
    if (c) {
      const parts = c.split('=')
      const name = parts[0]
      const value = decodeURIComponent(parts.slice(1).join('='))
      cookies[name] = value
    }
  }
  return cookies
}

/**
 * LocalStorage 操作工具
 */

/**
 * 设置 LocalStorage
 * @param {string} key 键
 * @param {any} value 值（会自动 JSON.stringify）
 * @returns {boolean} 是否成功
 */
export function setLocalStorage(key, value) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    localStorage.setItem(key, stringValue)
    return true
  } catch (error) {
    console.error('LocalStorage 设置失败:', error)
    return false
  }
}

/**
 * 获取 LocalStorage
 * @param {string} key 键
 * @param {any} defaultValue 默认值
 * @returns {any} 值（会自动 JSON.parse）
 */
export function getLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    try {
      return JSON.parse(item)
    } catch {
      // 如果不是 JSON 格式，直接返回原值
      return item
    }
  } catch (error) {
    console.error('LocalStorage 获取失败:', error)
    return defaultValue
  }
}

/**
 * 删除 LocalStorage
 * @param {string} key 键
 * @returns {boolean} 是否成功
 */
export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('LocalStorage 删除失败:', error)
    return false
  }
}

/**
 * 清空所有 LocalStorage
 * @returns {boolean} 是否成功
 */
export function clearLocalStorage() {
  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.error('LocalStorage 清空失败:', error)
    return false
  }
}

/**
 * 检查 LocalStorage 是否存在某个 key
 * @param {string} key 键
 * @returns {boolean}
 */
export function hasLocalStorage(key) {
  return localStorage.getItem(key) !== null
}

/**
 * SessionStorage 操作工具
 */

/**
 * 设置 SessionStorage
 * @param {string} key 键
 * @param {any} value 值（会自动 JSON.stringify）
 * @returns {boolean} 是否成功
 */
export function setSessionStorage(key, value) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    sessionStorage.setItem(key, stringValue)
    return true
  } catch (error) {
    console.error('SessionStorage 设置失败:', error)
    return false
  }
}

/**
 * 获取 SessionStorage
 * @param {string} key 键
 * @param {any} defaultValue 默认值
 * @returns {any} 值（会自动 JSON.parse）
 */
export function getSessionStorage(key, defaultValue = null) {
  try {
    const item = sessionStorage.getItem(key)
    if (item === null) {
      return defaultValue
    }
    try {
      return JSON.parse(item)
    } catch {
      // 如果不是 JSON 格式，直接返回原值
      return item
    }
  } catch (error) {
    console.error('SessionStorage 获取失败:', error)
    return defaultValue
  }
}

/**
 * 删除 SessionStorage
 * @param {string} key 键
 * @returns {boolean} 是否成功
 */
export function removeSessionStorage(key) {
  try {
    sessionStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('SessionStorage 删除失败:', error)
    return false
  }
}

/**
 * 清空所有 SessionStorage
 * @returns {boolean} 是否成功
 */
export function clearSessionStorage() {
  try {
    sessionStorage.clear()
    return true
  } catch (error) {
    console.error('SessionStorage 清空失败:', error)
    return false
  }
}

/**
 * 检查 SessionStorage 是否存在某个 key
 * @param {string} key 键
 * @returns {boolean}
 */
export function hasSessionStorage(key) {
  return sessionStorage.getItem(key) !== null
}

