import api from './index'

/** 用户列表 */
export function getUsers(params) {
  return api.get('/users', { params })
}

/** 创建用户 */
export function createUser(data) {
  return api.post('/users', data)
}

/** 编辑用户 */
export function updateUser(id, data) {
  return api.put(`/users/${id}`, data)
}

/** 删除用户 */
export function deleteUser(id) {
  return api.delete(`/users/${id}`)
}

/** 修改密码 */
export function changePassword(id, newPassword) {
  return api.put(`/users/${id}/password`, { newPassword })
}

/** 重置密码 */
export function resetPassword(id) {
  return api.post(`/users/${id}/reset-password`)
}

/** 冻结/解冻 */
export function freezeUser(id, freeze) {
  return api.put(`/users/${id}/freeze`, { freeze })
}
