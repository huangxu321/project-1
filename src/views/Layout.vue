<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo-area">
        <div class="logo-icon">■</div>
        <span>统一用户管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="transparent"
        style="border-right:none;padding-top:10px"
        @select="handleSelect"
        :router="false"
      >
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon><span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧主体 -->
    <div class="main-container">
      <header class="top-header">
        <div class="page-title">管理中心</div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="user-dropdown">
              <el-avatar :size="32" style="background-color:#409eff">{{ userInitial }}</el-avatar>
              <span>{{ userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout" style="color:#f56c6c">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { logout } from '../api/auth'
import { hasPermission, hasAnyPermission } from '../utils/permission'

const router = useRouter()
const route = useRoute()
const activeMenu = ref(route.path)

watch(() => route.path, (val) => {
  if (val.startsWith('/app/')) {
    activeMenu.value = '/app/' + val.split('/').pop()
  }
})

function handleSelect(index) {
  router.push(index)
}

const userInfo = computed(() => {
  try { return JSON.parse(localStorage.getItem('user_info') || '{}') } catch (e) { return {} }
})
const userName = computed(() => userInfo.value.realName || userInfo.value.username || '用户')
const userInitial = computed(() => userName.value.charAt(0))

// 按权限过滤菜单
const menuItems = computed(() => {
  const items = []
  // 用户管理：仅管理员可见
  if (hasAnyPermission('user_manage', 'role_manage', 'system_manage')) {
    items.push({ index: '/app/users', icon: 'User', label: '用户管理', permission: null })
  }
  if (hasAnyPermission('role_manage', 'system_manage')) {
    items.push({ index: '/app/roles', icon: 'Avatar', label: '角色管理', permission: 'role_manage' })
  }
  if (hasPermission('system_manage')) {
    items.push({ index: '/app/systems', icon: 'Monitor', label: '系统配置', permission: 'system_manage' })
  }
  // 普通用户：显示个人中心
  if (items.length === 0) {
    items.push({ index: '/app/home', icon: 'HomeFilled', label: '个人中心', permission: null })
  }
  return items
})

async function handleLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    .then(async () => {
      try { await logout() } catch (e) { /* ignore */ }
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      router.push('/login')
      ElMessage.success('已退出登录')
    })
    .catch(() => {})
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #d4e4fc 0%, #e8f0fe 50%, #c3d9f7 100%);
  color: #333;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
}
.logo-area {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  font-size: 16px;
  font-weight: 600;
  color: #1e3a5f;
}
.logo-icon {
  width: 32px; height: 32px;
  background: #3b82f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
}
.sidebar-menu .el-menu-item { color: #475569; }
.sidebar-menu .el-menu-item.is-active {
  color: #1e3a5f !important;
  font-weight: 600;
  background-color: rgba(59,130,246,0.12) !important;
}
.sidebar-menu .el-menu-item:hover { background-color: rgba(59,130,246,0.06); }

/* 主容器 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 顶部 */
.top-header {
  height: 56px;
  background: linear-gradient(90deg, #d4e4fc 0%, #e8f0fe 50%, #c3d9f7 100%);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}
.page-title { font-size: 16px; font-weight: 600; color: #1e3a5f; }
.header-right { display: flex; align-items: center; gap: 12px; }
.user-dropdown {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 内容区 */
.content-area {
  flex: 1;
  overflow: hidden;
  padding: 20px;
  background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 50%, #c3d9f7 100%);
}
</style>
