<template>
  <div class="example-container">
    <h2>使用示例</h2>

    <section>
      <h3>1. 使用 API 请求</h3>
      <button @click="handleApiRequest">发送 API 请求</button>
    </section>

    <section>
      <h3>2. Cookie 操作</h3>
      <button @click="handleCookie">Cookie 操作示例</button>
    </section>

    <section>
      <h3>3. LocalStorage 操作</h3>
      <button @click="handleStorage">Storage 操作示例</button>
    </section>

    <section>
      <h3>4. 工具函数</h3>
      <button @click="handleUtils">工具函数示例</button>
    </section>

    <section>
      <h3>5. Pinia Store</h3>
      <p>登录状态: {{ userStore.isLogin ? '已登录' : '未登录' }}</p>
      <button @click="handleLogin">模拟登录</button>
      <button @click="handleLogout">退出登录</button>
    </section>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores'
import { login } from '@/api/user'
import {
  setCookie,
  getCookie,
  removeCookie,
  setLocalStorage,
  getLocalStorage,
  formatDate,
  formatNumber,
  validateEmail,
  debounce
} from '@/utils'

const userStore = useUserStore()

// API 请求示例
async function handleApiRequest() {
  try {
    // 示例：登录请求
    const res = await login({
      username: 'admin',
      password: '123456'
    })
    console.log('登录成功:', res)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

// Cookie 操作示例
function handleCookie() {
  // 设置 Cookie（7 天过期）
  setCookie('testCookie', 'testValue', 7)
  console.log('Cookie 已设置')

  // 获取 Cookie
  const value = getCookie('testCookie')
  console.log('Cookie 值:', value)

  // 删除 Cookie
  // removeCookie('testCookie')
}

// Storage 操作示例
function handleStorage() {
  // 设置 LocalStorage
  setLocalStorage('testData', { name: 'John', age: 30 })
  console.log('LocalStorage 已设置')

  // 获取 LocalStorage
  const data = getLocalStorage('testData')
  console.log('LocalStorage 值:', data)
}

// 工具函数示例
function handleUtils() {
  // 日期格式化
  const date = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
  console.log('格式化日期:', date)

  // 数字格式化
  const num = formatNumber(1234567.89, 2)
  console.log('格式化数字:', num)

  // 邮箱验证
  const isValid = validateEmail('test@example.com')
  console.log('邮箱验证:', isValid)

  // 防抖函数
  const debouncedFn = debounce(() => {
    console.log('防抖函数执行')
  }, 300)
  debouncedFn()
}

// 登录示例
function handleLogin() {
  userStore.login('mock-token-123', {
    id: 1,
    username: 'admin',
    name: '管理员'
  })
  console.log('已登录')
}

// 退出登录示例
function handleLogout() {
  userStore.logout()
  console.log('已退出登录')
}
</script>

<style scoped>
.example-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

h3 {
  margin-bottom: 15px;
  color: #333;
}

button {
  padding: 8px 16px;
  margin-right: 10px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #66b1ff;
}
</style>

