import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setLocalStorage, getLocalStorage, removeLocalStorage } from '@/utils/storage'

/**
 * 用户 Store
 */
export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(getLocalStorage('token') || '')
  const userInfo = ref(getLocalStorage('userInfo') || null)

  // Getters
  const isLogin = computed(() => !!token.value)

  // Actions
  /**
   * 设置 token
   * @param {string} newToken
   */
  function setToken(newToken) {
    token.value = newToken
    setLocalStorage('token', newToken)
  }

  /**
   * 设置用户信息
   * @param {object} info
   */
  function setUserInfo(info) {
    userInfo.value = info
    setLocalStorage('userInfo', info)
  }

  /**
   * 登录
   * @param {string} newToken
   * @param {object} info
   */
  function login(newToken, info) {
    setToken(newToken)
    setUserInfo(info)
  }

  /**
   * 退出登录
   */
  function logout() {
    token.value = ''
    userInfo.value = null
    removeLocalStorage('token')
    removeLocalStorage('userInfo')
  }

  return {
    // 状态
    token,
    userInfo,
    // Getters
    isLogin,
    // Actions
    setToken,
    setUserInfo,
    login,
    logout
  }
})

