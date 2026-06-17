<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="logo-area">
        <div class="logo-icon"><el-icon><Monitor /></el-icon></div>
        <span>统一用户管理系统</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        background-color="transparent"
        text-color="#a0b4d0"
        active-text-color="#fff"
        router
        style="border-right: none; padding-top: 10px;"
      >
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/roles">
          <el-icon><Avatar /></el-icon>
          <span>角色管理</span>
        </el-menu-item>
        <!-- 系统配置 -->
        <el-menu-item index="/systems">
          <el-icon><Setting /></el-icon>
          <span>系统配置</span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 主体区域 -->
    <div class="main-container">
      <div class="header">
        <div style="font-size: 16px; font-weight: 600; color: #333;">管理中心</div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-dropdown">
              <el-avatar :size="32" style="background-color: #3b82f6;">
                {{ userInfo?.realName?.charAt(0) || userInfo?.username?.charAt(0) || 'U' }}
              </el-avatar>
              <span>{{ userInfo?.realName || userInfo?.username || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout" style="color: #f56c6c;">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)
const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

function handleCommand(command) {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' }).then(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      router.push('/login')
      ElMessage.success('已退出登录')
    }).catch(() => {})
  }
}
</script>
