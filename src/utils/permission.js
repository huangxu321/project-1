/**
 * 权限工具 — 从 localStorage 获取用户权限信息
 */

/** 获取当前用户的权限列表 */
export function getUserPermissions() {
  try {
    const info = JSON.parse(localStorage.getItem('user_info') || '{}')
    return info.permissions || []
  } catch (e) {
    return []
  }
}

/** 检查是否拥有指定权限 */
export function hasPermission(code) {
  return getUserPermissions().includes(code)
}

/** 检查是否拥有任一权限 */
export function hasAnyPermission(...codes) {
  const perms = getUserPermissions()
  return codes.some(c => perms.includes(c))
}

/** 检查是否有管理员角色 */
export function isAdministrator() {
  try {
    const info = JSON.parse(localStorage.getItem('user_info') || '{}')
    return (info.roles || []).some(r => r.code === 'administrator')
  } catch (e) {
    return false
  }
}
