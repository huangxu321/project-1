import api from './index'

/** 登录 */
export function login(username, password, systemCode) {
  return api.post('/auth/login', { username, password, systemCode: systemCode || undefined })
}

/** 注册 */
export function register(data) {
  return api.post('/auth/register', data)
}

/** 获取当前用户信息 */
export function getMe() {
  return api.get('/auth/me')
}

/** 退出登录 */
export function logout() {
  return api.post('/auth/logout')
}
