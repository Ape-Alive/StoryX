/**
 * 环境配置
 */
const env = {
    // 开发环境
    development: {
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
        appTitle: import.meta.env.VITE_APP_TITLE || 'StoryX Development',
        env: 'development'
    },
    // 测试环境
    test: {
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://test-api.example.com/api',
        appTitle: import.meta.env.VITE_APP_TITLE || 'StoryX Test',
        env: 'test'
    },
    // 生产环境
    production: {
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.example.com/api',
        appTitle: import.meta.env.VITE_APP_TITLE || 'StoryX Production',
        env: 'production'
    }
}

// 当前环境
const currentEnv = import.meta.env.MODE || 'development'

// 导出当前环境配置
export default env[currentEnv] || env.development

// 导出所有环境配置（可选）
export { env }

