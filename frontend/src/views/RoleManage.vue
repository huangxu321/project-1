<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="font-size: 20px; font-weight: 600;">角色管理</h2>
      <el-button type="primary" @click="handleCreate">创建</el-button>
    </div>

    <!-- 左右布局 -->
    <div style="display: flex; gap: 16px; background: #fff; border-radius: 8px; overflow: hidden;">
      <!-- 左侧：角色列表 -->
      <div style="width: 360px; border-right: 1px solid #eee; display: flex; flex-direction: column;">
        <div style="padding: 14px 16px; border-bottom: 1px solid #f0f0f0;">
          <el-input v-model="searchKey" placeholder="编码/名称" prefix-icon="Search" size="default"
                    clearable @input="filterRoles"/>
        </div>
        <div style="flex: 1; overflow-y: auto;">
          <div v-for="r in filteredRoleList" :key="r.id"
               :style="{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
                        backgroundColor: selectedId === r.id ? '#e8f4fd' : (hoveredId === r.id ? '#f9f9f9' : ''),
                        transition: 'background-color .2s' }"
               @click="selectRole(r)" @mouseenter="hoveredId = r.id" @mouseleave="hoveredId = null">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span :style="{ fontWeight: 500, color: selectedId === r.id ? '#409eff' : '#333' }">{{ r.name }}</span>
              <el-tag type="success" size="small" effect="light">启用</el-tag>
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">{{ r.code }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：权限配置区 -->
      <div style="flex: 1; padding: 20px 24px;" v-loading="detailLoading">
        <template v-if="selectedRole">
          <h3 style="font-size: 18px; margin-bottom: 4px;">{{ selectedRole.name }}</h3>
          <p style="color: #999; font-size: 13px; margin-bottom: 24px;">{{ selectedRole.description || '' }}</p>

          <!-- 功能权限 -->
          <div style="margin-bottom: 28px;">
            <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">角色权限配置</h4>
            <el-checkbox-group v-model="selectedPermissions.functions">
              <div style="margin-bottom: 10px;">
                <el-checkbox label="user_manage">
                  <el-icon><Setting /></el-icon> 管理中心
                </el-checkbox>
                <div style="padding-left: 26px; margin-top: 6px;">
                  <el-checkbox label="user_manage">用户管理</el-checkbox>
                  <el-checkbox label="role_manage" style="margin-left: 20px;">角色管理</el-checkbox>
                </div>
              </div>
            </el-checkbox-group>
          </div>

          <!-- 子系统配置（可访问链接） -->
          <div>
            <el-checkbox v-model="showSubsystemConfig" style="margin-bottom: 12px;">系统配置</el-checkbox>
            <div v-if="showSubsystemConfig">
              <el-checkbox-group v-model="selectedPermissions.subsystems">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                  <el-checkbox v-for="s in subsystemList" :key="s.code" :label="s.code">
                    浏览 {{ s.name }}系统
                  </el-checkbox>
                </div>
              </el-checkbox-group>
              <el-input
                v-if="selectedPermissions.subsystems.length > 0"
                type="textarea"
                placeholder="请输入可浏览的系统链接URL，配置后该角色用户可通过此URL登录"
                :rows="3"
                style="margin-top: 12px;"
                disabled
                :model-value="getSubsystemUrls()"
              />
            </div>
          </div>

          <div style="text-align: right; margin-top: 32px;">
            <el-button type="primary" @click="savePermissions" :loading="saving">保存权限</el-button>
          </div>
        </template>

        <div v-else style="display: flex; align-items: justify-content: center; height: 100%; color: #999;">
          请选择一个角色查看/编辑权限
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'

const roleList = ref([])
const filteredRoleList = ref([])
const searchKey = ref('')
const selectedId = ref(null)
const hoveredId = ref(null)
const selectedRole = ref(null)
const detailLoading = ref(false)
const saving = ref(false)

// 权限数据
const selectedPermissions = ref({ functions: [], subsystems: [] })
const showSubsystemConfig = ref(false)
const subsystemList = ref([])

function filterRoles() {
  if (!searchKey.value) {
    filteredRoleList.value = [...roleList.value]
  } else {
    const k = searchKey.value.toLowerCase()
    filteredRoleList.value = roleList.value.filter(r =>
      r.name.includes(k) || r.code.includes(k))
  }
}

async function fetchRoles() {
  const res = await request.get('/roles')
  if (res.code === 200) {
    roleList.value = res.data
    filteredRoleList.value = [...roleList.value]
  }
}

async function selectRole(role) {
  if (selectedId.value === role.id) return
  selectedId.value = role.id
  detailLoading.value = true

  const res = await request.get('/roles/' + role.id)
  if (res.code === 200) {
    selectedRole.value = res.data
    selectedPermissions.value = {
      functions: res.data.permissions?.functions || [],
      subsystems: res.data.permissions?.subsystems || []
    }
    subsystemList.value = res.data.availableSubsystems || []
    showSubsystemConfig.value = selectedPermissions.value.subsystems.length > 0
  }
  detailLoading.value = false
}

function getSubsystemUrls() {
  return subsystemList.value
    .filter(s => selectedPermissions.value.subsystems.includes(s.code))
    .map(s => `${s.name}: ${s.access_url}`)
    .join('\n')
}

async function savePermissions() {
  saving.value = true
  try {
    // 构建权限数组
    const permissions = [
      ...selectedPermissions.value.functions.map(code => ({ type: 'function', code })),
      ...selectedPermissions.value.subsystems.map(code => ({ type: 'subsystem', code }))
    ]

    const payload = {
      name: selectedRole.value.name,
      code: selectedRole.value.code,
      description: selectedRole.value.description,
      status: selectedRole.value.status,
      permissions
    }

    const res = await request.put('/roles/' + selectedRole.value.id, payload)
    if (res.code === 200) ElMessage.success('保存成功')
    else ElMessage.error(res.message || '保存失败')
  } catch(e) { ElMessage.error('网络错误') }
  finally { saving.value = false }
}

function handleCreate() {
  ElMessageBox.prompt('请输入角色名称', '创建角色', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: '角色名称',
    inputValidator: (val) => !val && '请输入角色名称'
  }).then(async ({ value: name }) => {
    const code = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const res = await request.post('/roles', {
      name, code,
      permissions: [{ type: 'function', code: 'user_manage' }]
    })
    if (res.code === 200) {
      ElMessage.success('创建成功')
      fetchRoles()
    }
  }).catch(() => {})
}

onMounted(() => { fetchRoles(); fetchSystems() })

async function fetchSystems() {
  const res = await request.get('/systems')
  if (res.code === 200) subsystemList.value = res.data
}
</script>
