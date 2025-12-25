<template>
  <div class="example-container">
    <h2>API 统一导出使用示例</h2>

    <section>
      <h3>方式一：从统一导出入口导入（推荐）</h3>
      <pre><code>// 从 @/api 统一导入（推荐）
import { login, logout, getUserInfo, updateUserInfo } from '@/api'

// 使用
async function handleLogin() {
  const response = await login({ email: 'test@example.com', password: '123456' })
}</code></pre>
    </section>

    <section>
      <h3>方式二：从具体模块导入</h3>
      <pre><code>// 从具体模块导入
import { login } from '@/api/user'

// 使用
async function handleLogin() {
  const response = await login({ email: 'test@example.com', password: '123456' })
}</code></pre>
    </section>

    <section>
      <h3>完整示例</h3>
      <button @click="testLogin">测试登录 API</button>
      <button @click="testGetUserInfo">测试获取用户信息</button>
    </section>
  </div>
</template>

<script setup>
// 方式一：从统一导出入口导入（推荐）
import { login, getUserInfo, logout } from '@/api'
// 这样可以直接使用所有在 src/api/index.js 中导出的 API

// 如果需要导入多个 API，可以这样：
// import { login, logout, getUserInfo, updateUserInfo } from '@/api'

async function testLogin() {
  try {
    const response = await login({
      email: 'test@example.com',
      password: '123456'
    })
    console.log('登录成功:', response)
  } catch (error) {
    console.error('登录失败:', error)
  }
}

async function testGetUserInfo() {
  try {
    const response = await getUserInfo()
    console.log('用户信息:', response)
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
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
  border-radius: 8px;
}

h3 {
  margin-bottom: 15px;
  color: #333;
}

pre {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
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

