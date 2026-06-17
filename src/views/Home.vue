<template>
  <div>
    <div class="section-header">
      <h2>个人中心</h2>
    </div>

    <div class="home-grid">
      <!-- 用户信息 -->
      <div class="info-card">
        <h3>用户信息</h3>
        <div class="info-list">
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ userInfo.username || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">真实姓名</span>
            <span class="info-value">{{ userInfo.realName || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ userInfo.email || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">手机号</span>
            <span class="info-value">{{ userInfo.phone || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">账号状态</span>
            <span class="info-value">
              <el-tag :type="userInfo.status === 1 ? 'success' : 'danger'" size="small">
                {{ userInfo.status === 1 ? '正常' : '已冻结' }}
              </el-tag>
            </span>
          </div>
        </div>
      </div>

      <!-- 可访问子系统 -->
      <div class="info-card">
        <h3>可访问的子系统</h3>
        <div v-if="accessibleSystems.length > 0" class="system-list">
          <div v-for="sys in accessibleSystems" :key="sys.id" class="system-item">
            <div class="system-name">{{ sys.name }}</div>
            <div class="system-code">{{ sys.code }}</div>
            <div class="system-desc">{{ sys.description || '' }}</div>
            <a :href="sys.access_url" target="_blank" class="system-link">
              <el-icon><Link /></el-icon> 前往系统
            </a>
          </div>
        </div>
        <el-empty v-else description="暂无可访问的子系统" :image-size="80" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'

const userInfo = ref(JSON.parse(localStorage.getItem('user_info') || '{}'))
const accessibleSystems = ref([])

onMounted(async () => {
  try {
    const res = await api.get('/systems/accessible')
    if (res.code === 200) {
      accessibleSystems.value = res.data.systems || []
    }
  } catch (e) {
    /* ignore */
  }
})
</script>

<style scoped>
.home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.info-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.info-card h3 {
  font-size: 16px;
  color: #1e3a5f;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e8ecf0;
}
.info-list .info-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}
.info-label {
  width: 90px;
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
}
.info-value {
  color: #333;
  font-size: 14px;
}
.system-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.system-item {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}
.system-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.system-code {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.system-desc {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}
.system-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 13px;
  color: #3b82f6;
  text-decoration: none;
}
.system-link:hover {
  text-decoration: underline;
}
</style>
