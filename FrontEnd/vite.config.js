import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [
        vue(),
        // 自定义插件：只在文件保存时触发完整刷新（使用防抖）
        {
            name: 'reload-on-save-only',
            configureServer(server) {
                let reloadTimer = null

                server.watcher.on('change', (file) => {
                    // 忽略 node_modules 和 .git 文件
                    if (file.includes('node_modules') || file.includes('.git')) {
                        return
                    }

                    // 清除之前的定时器
                    if (reloadTimer) {
                        clearTimeout(reloadTimer)
                    }

                    // 延迟 300ms 执行刷新，如果文件继续变化则重新计时
                    // 这样可以确保只在文件真正保存（不再变化）后才刷新
                    reloadTimer = setTimeout(() => {
                        server.ws.send({
                            type: 'full-reload'
                        })
                    }, 300)
                })
            }
        }
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 9500,
        host: '0.0.0.0', // 允许网络访问
        open: true,
        hmr: {
            host: 'localhost'
        }
    }
})

