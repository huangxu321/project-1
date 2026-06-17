import api from './index'

/** 系统列表 */
export function getSystems() {
  return api.get('/systems')
}

/** 创建系统 */
export function createSystem(data) {
  return api.post('/systems', data)
}

/** 编辑系统 */
export function updateSystem(id, data) {
  return api.put(`/systems/${id}`, data)
}

/** 删除系统 */
export function deleteSystem(id) {
  return api.delete(`/systems/${id}`)
}
