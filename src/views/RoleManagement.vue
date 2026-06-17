<template>
  <div>
    <div class="section-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="openCreateDialog">创建角色</el-button>
    </div>

    <div class="role-layout">
      <!-- 角色列表 -->
      <div class="role-list-panel">
        <div class="role-search">
          <el-input v-model="searchKey" placeholder="编码/名称" clearable />
        </div>
        <div class="role-items" v-loading="listLoading">
          <div
            v-for="r in filteredRoles" :key="r.id"
            :class="['role-item', { active: selectedRoleId === r.id }]"
            @click="selectRole(r)"
          >
            <div class="role-item-top">
              <span :class="['role-name', { active: selectedRoleId === r.id }]">{{ r.name }}</span>
              <el-tag v-if="BUILTIN_ROLES.includes(r.code)" type="info" size="small" effect="light">内置</el-tag>
              <el-tag v-else type="success" size="small" effect="light">启用</el-tag>
            </div>
            <div class="role-code">{{ r.code }}</div>
          </div>
          <div v-if="!filteredRoles.length" class="role-empty">暂无角色</div>
        </div>
      </div>

      <!-- 角色详情 -->
      <div class="role-detail-panel" v-loading="detailLoading">
        <template v-if="selectedRole">
          <div class="detail-header">
            <div>
              <h3>{{ selectedRole.name }}</h3>
              <p class="detail-desc">{{ selectedRole.description || '暂无描述' }}</p>
            </div>
            <div class="detail-actions">
              <el-button size="small" @click="editRoleInfo(selectedRole)">编辑信息</el-button>
              <el-button
                v-if="!BUILTIN_ROLES.includes(selectedRole.code)"
                size="small" type="danger" plain @click="deleteRole(selectedRole)">删除</el-button>
            </div>
          </div>

          <!-- 功能权限 -->
          <div class="perm-section">
            <h4>功能权限</h4>
            <el-checkbox-group v-model="permissions.functions">
              <el-checkbox v-for="f in availableFunctions" :key="f.code" :label="f.code">{{ f.name }}</el-checkbox>
            </el-checkbox-group>
          </div>

          <!-- 可访问系统 -->
          <div class="perm-section">
            <h4>可访问系统</h4>
            <el-checkbox-group v-model="permissions.subsystems">
              <div class="subsystem-grid">
                <el-checkbox v-for="s in allSystems" :key="s.id" :label="s.code">
                  {{ s.name }} <span class="sub-url">({{ s.access_url }})</span>
                </el-checkbox>
              </div>
            </el-checkbox-group>
            <div v-if="!allSystems.length" class="no-systems">
              暂无系统，请先在 <el-link type="primary" @click="$router.push('/app/systems')">系统配置</el-link> 中添加系统
            </div>
          </div>

          <div class="save-bar">
            <el-button type="primary" @click="savePermissions" :loading="saving">保存权限</el-button>
          </div>
        </template>
        <div v-else class="no-selection">请选择一个角色查看/编辑权限</div>
      </div>
    </div>

    <!-- 创建/编辑角色弹窗 -->
    <el-dialog v-model="roleDialogVisible" :title="isEdit ? '编辑角色' : '创建角色'" width="520px" destroy-on-close>
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleFormRules" label-width="90px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" placeholder="英文/数字/下划线" :disabled="isEdit" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色描述">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="请输入角色描述（选填）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRoleForm" :loading="roleFormLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRoles, getRole, createRole, updateRole, deleteRole as delRole } from '../api/roles'
import { getSystems } from '../api/systems'
import { isAdministrator } from '../utils/permission'

const BUILTIN_ROLES = ['administrator', 'normal_user']

const roles = ref([])
const searchKey = ref('')
const listLoading = ref(false)

const filteredRoles = computed(() => {
  if (!searchKey.value) return roles.value
  const k = searchKey.value.toLowerCase()
  return roles.value.filter(r => r.name.includes(k) || r.code.includes(k))
})

const selectedRoleId = ref(null)
const selectedRole = ref(null)
const detailLoading = ref(false)
const permissions = ref({ functions: [], subsystems: [] })
const saving = ref(false)
const allSystems = ref([])
const availableFunctions = ref([
  { code: 'user_manage', name: '用户管理' },
  { code: 'role_manage', name: '角色管理' },
  { code: 'system_manage', name: '系统配置' }
])

onMounted(() => {
  fetchRoles()
  fetchAllSystems()
})

async function fetchRoles() {
  listLoading.value = true
  try {
    const res = await getRoles()
    if (res.code === 200) roles.value = res.data || []
  } catch (e) { /* ignore */ }
  listLoading.value = false
}

async function fetchAllSystems() {
  try {
    const res = await getSystems()
    if (res.code === 200) allSystems.value = (res.data || []).filter(s => s.status === 1)
  } catch (e) { /* ignore */ }
}

async function selectRole(role) {
  if (selectedRoleId.value === role.id) return
  selectedRoleId.value = role.id
  detailLoading.value = true
  try {
    const res = await getRole(role.id)
    if (res.code === 200) {
      selectedRole.value = res.data
      permissions.value = {
        functions: [...(res.data.permissions?.functions || [])],
        subsystems: [...(res.data.permissions?.subsystems || [])]
      }
    }
  } catch (e) { /* ignore */ }
  detailLoading.value = false
}

async function savePermissions() {
  saving.value = true
  try {
    const permList = [
      ...permissions.value.functions.map(c => ({ type: 'function', code: c })),
      ...permissions.value.subsystems.map(c => ({ type: 'subsystem', code: c }))
    ]
    const res = await updateRole(selectedRoleId.value, {
      name: selectedRole.value.name,
      code: selectedRole.value.code,
      description: selectedRole.value.description,
      permissions: permList
    })
    if (res.code === 200) {
      ElMessage.success('权限保存成功')
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* ignore */ }
  saving.value = false
}

// 创建/编辑
const roleDialogVisible = ref(false)
const isEdit = ref(false)
const roleFormRef = ref(null)
const roleFormLoading = ref(false)
const roleForm = reactive({ id: null, name: '', code: '', description: '' })
const roleFormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: '编码需以字母开头，可包含字母、数字、下划线、连字符', trigger: 'blur' }
  ]
}

function openCreateDialog() {
  isEdit.value = false
  Object.assign(roleForm, { id: null, name: '', code: '', description: '' })
  roleDialogVisible.value = true
}

function editRoleInfo(role) {
  isEdit.value = true
  Object.assign(roleForm, { id: role.id, name: role.name, code: role.code, description: role.description || '' })
  roleDialogVisible.value = true
}

async function submitRoleForm() {
  const vf = roleFormRef.value
  if (!vf) return
  try { await vf.validate() } catch (e) { return }
  roleFormLoading.value = true
  try {
    let res
    if (isEdit.value) {
      res = await updateRole(roleForm.id, { name: roleForm.name, description: roleForm.description })
    } else {
      res = await createRole({ name: roleForm.name, code: roleForm.code, description: roleForm.description })
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '角色信息更新成功' : '角色创建成功')
      roleDialogVisible.value = false
      await fetchRoles()
      if (!isEdit.value) {
        const newRole = roles.value.find(r => r.code === roleForm.code)
        if (newRole) selectRole(newRole)
      }
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* ignore */ }
  roleFormLoading.value = false
}

async function deleteRole(role) {
  ElMessageBox.confirm(`确定要删除角色"${role.name}"吗？`, '删除角色', { type: 'warning' })
    .then(async () => {
      const res = await delRole(role.id)
      if (res.code === 200) {
        ElMessage.success('角色已删除')
        if (selectedRoleId.value === role.id) {
          selectedRoleId.value = null
          selectedRole.value = null
        }
        fetchRoles()
      } else {
        ElMessage.error(res.message)
      }
    })
    .catch(() => {})
}
</script>

<style scoped>
h2 { font-size: 20px; font-weight: 600; color: #1a1a2e; }
h3 { font-size: 18px; margin-bottom: 4px; }
h4 { font-size: 15px; font-weight: 600; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }

.role-layout { display: flex; gap: 16px; flex: 1; min-height: 0; }

.role-list-panel {
  width: 320px; background: #fff; border-radius: 8px;
  display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0;
}
.role-search { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
.role-items { flex: 1; overflow-y: auto; }
.role-item {
  padding: 14px 20px; cursor: pointer; border-bottom: 1px solid #f5f5f5;
  background-color: #fff; transition: background-color .2s;
}
.role-item.active { background-color: #e8f4fd; }
.role-item-top { display: flex; justify-content: space-between; align-items: center; }
.role-name { font-weight: 500; color: #333; }
.role-name.active { color: #409eff; }
.role-code { font-size: 12px; color: #999; margin-top: 4px; }
.role-empty { text-align: center; padding: 40px; color: #999; }

.role-detail-panel {
  flex: 1; background: #fff; border-radius: 8px; padding: 24px; overflow-y: auto;
}
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.detail-desc { color: #999; font-size: 13px; }
.detail-actions { display: flex; gap: 8px; }
.perm-section { margin-bottom: 28px; }
.subsystem-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
}
.sub-url { color: #999; font-size: 12px; margin-left: 4px; }
.save-bar { text-align: right; margin-top: 32px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
.no-selection { display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px; }
.no-systems { color: #999; font-size: 13px; padding: 10px 0; }
</style>
