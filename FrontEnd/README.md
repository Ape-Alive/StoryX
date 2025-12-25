# StoryX FrontEnd

基于 Vue 3 + JavaScript + Vite + Pinia 的前端项目

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 的状态管理库
- **Axios** - HTTP 客户端

## 项目结构

```
FrontEnd/
├── src/
│   ├── api/              # API 接口
│   │   ├── user.js       # 用户相关接口
│   │   └── index.js      # API 统一导出
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── config/           # 配置文件
│   │   └── env.js        # 环境配置
│   ├── stores/           # Pinia stores
│   │   ├── user.js       # 用户 store
│   │   └── index.js      # Store 统一导出
│   ├── utils/            # 工具函数
│   │   ├── request.js    # HTTP 请求封装
│   │   ├── storage.js    # 存储工具（Cookie、LocalStorage、SessionStorage）
│   │   ├── common.js     # 通用工具函数
│   │   └── index.js      # 工具函数统一导出
│   ├── views/            # 页面组件
│   ├── App.vue           # 根组件
│   ├── main.js           # 入口文件
│   └── style.css         # 全局样式
├── .env.development      # 开发环境配置
├── .env.test             # 测试环境配置
├── .env.production       # 生产环境配置
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
└── README.md             # 项目说明
```

## 安装依赖

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 构建

```bash
# 生产环境构建
npm run build

# 测试环境构建
npm run build:test
```

## 功能特性

### 1. 多环境配置

支持开发、测试、生产三种环境：

- `.env.development` - 开发环境
- `.env.test` - 测试环境
- `.env.production` - 生产环境

环境变量通过 `import.meta.env` 访问。

### 2. HTTP 请求封装

使用 `src/utils/request.js` 封装的请求方法：

```javascript
import request from '@/utils/request'

// GET 请求
request.get('/api/user/info', { id: 1 })

// POST 请求
request.post('/api/user/login', { username: 'admin', password: '123456' })

// PUT 请求
request.put('/api/user/info', { name: 'John' })

// DELETE 请求
request.delete('/api/user/1')

// PATCH 请求
request.patch('/api/user/1', { status: 'active' })
```

### 3. 存储工具

#### Cookie 操作

```javascript
import { setCookie, getCookie, removeCookie, hasCookie } from '@/utils/storage'

// 设置 Cookie（默认 7 天过期）
setCookie('token', 'abc123', 7)

// 获取 Cookie
const token = getCookie('token')

// 删除 Cookie
removeCookie('token')

// 检查 Cookie 是否存在
if (hasCookie('token')) {
  console.log('Token exists')
}
```

#### LocalStorage 操作

```javascript
import { setLocalStorage, getLocalStorage, removeLocalStorage } from '@/utils/storage'

// 设置（自动 JSON 序列化）
setLocalStorage('userInfo', { name: 'John', age: 30 })

// 获取（自动 JSON 反序列化）
const userInfo = getLocalStorage('userInfo')

// 删除
removeLocalStorage('userInfo')
```

#### SessionStorage 操作

```javascript
import { setSessionStorage, getSessionStorage, removeSessionStorage } from '@/utils/storage'

// 使用方式同 LocalStorage
```

### 4. 通用工具函数

```javascript
import {
  debounce,      // 防抖
  throttle,      // 节流
  deepClone,     // 深拷贝
  formatDate,    // 日期格式化
  formatFileSize,// 文件大小格式化
  validatePhone, // 手机号验证
  validateEmail, // 邮箱验证
  formatNumber,  // 数字千分位格式化
  isEmpty,       // 判断是否为空
  sleep          // 延迟函数
} from '@/utils/common'
```

### 5. Pinia Store

使用 Pinia 进行状态管理：

```javascript
import { useUserStore } from '@/stores'

const userStore = useUserStore()

// 登录
userStore.login(token, userInfo)

// 退出登录
userStore.logout()

// 获取登录状态
if (userStore.isLogin) {
  console.log('已登录')
}
```

## 使用示例

### 在组件中使用 API

```vue
<template>
  <div>
    <button @click="handleLogin">登录</button>
  </div>
</template>

<script setup>
import { login } from '@/api/user'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

async function handleLogin() {
  try {
    const res = await login({
      username: 'admin',
      password: '123456'
    })

    userStore.login(res.data.token, res.data.userInfo)
  } catch (error) {
    console.error('登录失败:', error)
  }
}
</script>
```

## 注意事项

1. 环境变量需要以 `VITE_` 开头才能在客户端代码中访问
2. 请求拦截器会自动从 Cookie 或 LocalStorage 中读取 token
3. 根据后端返回的数据结构，可能需要调整 `request.js` 中的响应拦截器逻辑

