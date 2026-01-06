import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],

    // 开发服务器配置
    server: {
        port: 3000,
        // 代理 API 请求到后端
        proxy: {
            '/api': {
                target: 'http://localhost:8088',
                changeOrigin: true
            }
        }
    },

    // 构建配置
    build: {
        // 输出到 public 目录（替换原有前端）
        outDir: '../public',
        emptyOutDir: true
    }
})
