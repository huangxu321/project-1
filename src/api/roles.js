import api from './index'

/** 角色列表 */
export function getRoles() {
  return api.get('/roles')
}

/** 获取角色详情 */
export function getRole(id) {
  return api.get(`/roles/${id}`)
}

/** 创建角色 */
export function createRole(data) {
  return api.post('/roles', data)
}

/** 编辑角色 */
export function updateRole(id, data) {
  return api.put(`/roles/${id}`, data)
}

/** 删除角色 */
export function deleteRole(id) {
  return api.delete(`/roles/${id}`)
}
