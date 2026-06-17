/**
 * API 客户端 - axios 实例封装
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 请求拦截器 - 注入 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    try {
      const parsed = JSON.parse(token)
      config.headers.Authorization = `Bearer ${parsed.token || ''}`
    } catch (e) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      const { status } = error.response
      if (status === 401) {
        localStorage.removeItem('auth_token')
        window.location.hash = '#/login'
        ElMessage.error('登录已过期，请重新登录')
      } else {
        ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络错误，请检查服务连接')
    }
    return Promise.reject(error)
  }
)

export default api
