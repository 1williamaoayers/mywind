/**
 * API 封装
 */

import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
api.interceptors.request.use(
    config => {
        // 可以在这里添加 token 等认证信息
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器
api.interceptors.response.use(
    response => {
        return response
    },
    error => {
        console.error('API Error:', error.message)
        return Promise.reject(error)
    }
)

export default api
