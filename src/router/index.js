import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Layout from '../views/Layout.vue'
import Home from '../views/Home.vue'
import UserManagement from '../views/UserManagement.vue'
import RoleManagement from '../views/RoleManagement.vue'
import SystemConfig from '../views/SystemConfig.vue'
import { hasPermission, hasAnyPermission, getUserPermissions } from '../utils/permission'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  {
    path: '/app',
    component: Layout,
    redirect: to => {
      // 根据权限决定跳转到哪个页面
      const perms = getUserPermissions()
      if (perms.length === 0) {
        return '/app/home'  // 普通用户 → 个人中心
      }
      return '/app/users'   // 管理员 → 用户管理
    },
    children: [
      { path: 'home', component: Home },                                    // 所有登录用户可见
      { path: 'users', component: UserManagement, meta: { permission: ['user_manage', 'role_manage', 'system_manage'] } },
      { path: 'roles', component: RoleManagement, meta: { permission: ['role_manage', 'system_manage'] } },
      { path: 'systems', component: SystemConfig, meta: { permission: 'system_manage' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫 — 认证 + 权限校验
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  if (to.path.startsWith('/app') && !token) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    next('/app/users')
  } else if (to.meta && to.meta.permission && token) {
    // 权限检查
    const perm = to.meta.permission
    let allowed = false
    if (Array.isArray(perm)) {
      allowed = hasAnyPermission(...perm)
    } else {
      allowed = hasPermission(perm)
    }
    if (!allowed) {
      next('/app/home') // 无权限 → 跳转个人中心
      return
    }
    next()
  } else {
    next()
  }
})

export default router
