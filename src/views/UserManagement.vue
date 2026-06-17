<template>
  <div class="page-full">
    <div class="section-header">
      <h2>用户管理</h2>
      <el-button v-if="canEdit" type="primary" @click="openCreateDialog">新建用户</el-button>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-bar">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input v-model="keyword" placeholder="账号/手机号/邮箱/用户名" clearable @input="onSearch" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterRoleId" placeholder="角色筛选" clearable @change="fetchUsers" style="width:100%">
            <el-option v-for="r in allRoles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="filterFrozen" placeholder="冻结状态" clearable @change="fetchUsers" style="width:100%">
            <el-option label="正常" :value="0" />
            <el-option label="冻结" :value="1" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <!-- 用户表格 -->
    <div class="table-wrap" v-loading="tableLoading">
      <table class="plain-table plain-table--stripe">
        <thead>
          <tr>
            <th style="min-width:100px">用户账号</th>
            <th style="min-width:80px">用户名</th>
            <th style="min-width:140px">用户角色</th>
            <th style="min-width:180px">邮箱</th>
            <th style="min-width:140px">手机号</th>
            <th style="min-width:90px" class="align-center">冻结状态</th>
            <th style="min-width:120px">有效期始</th>
            <th style="min-width:120px">有效期至</th>
            <th style="min-width:160px">创建时间</th>
            <th style="min-width:160px" class="align-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in users" :key="row.id">
            <td>{{ row.username }}</td>
            <td>{{ row.real_name || '-' }}</td>
            <td>{{ row.roleNames?.join('、') || '-' }}</td>
            <td>{{ row.email || '-' }}</td>
            <td>{{ row.phone || '-' }}</td>
            <td class="align-center">
              <el-tag :type="row.locked===1?'danger':'success'" size="small" effect="light">{{ row.locked===1?'冻结':'正常' }}</el-tag>
            </td>
            <td>{{ row.valid_from || '-' }}</td>
            <td>{{ row.valid_until || '-' }}</td>
            <td>{{ row.created_at || '-' }}</td>
            <td class="align-center">
              <template v-if="canEdit">
                <el-link type="primary" style="margin-right:6px" @click="openEditDialog(row)">编辑</el-link>
                <el-link type="warning" style="margin-right:6px" @click="resetPassword(row)">重置密码</el-link>
                <el-link type="danger" @click="deleteUser(row)">删除</el-link>
              </template>
              <span v-else style="color:#c0c4cc">-</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!users.length" style="text-align:center;padding:60px;color:#999">
        <el-empty description="暂无用户数据" :image-size="80" />
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page" v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]" :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background small @size-change="fetchUsers" @current-change="fetchUsers"
      />
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新建用户'" width="600px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="用户账号" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="用于登录的账号" maxlength="20" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? null : 'password'">
          <el-input v-model="form.password" type="password" :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'" show-password />
        </el-form-item>
        <el-form-item label="用户名" prop="realName">
          <el-input v-model="form.realName" placeholder="登录后显示的名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱（选填）" maxlength="100" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号（选填）" maxlength="20" />
        </el-form-item>
        <el-form-item label="有效期始">
          <el-date-picker v-model="form.validFrom" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker v-model="form.validUntil" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="冻结状态">
          <el-switch v-model="form.locked" active-text="冻结" inactive-text="正常" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="角色分配">
          <el-checkbox-group v-model="form.roleIds">
            <el-checkbox v-for="r in allRoles" :key="r.id" :label="r.id">{{ r.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="formLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, deleteUser as delUser, resetPassword as resetPwd } from '../api/users'
import { getRoles } from '../api/roles'
import { hasPermission } from '../utils/permission'

const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const tableLoading = ref(false)
const keyword = ref('')
const filterRoleId = ref('')
const filterFrozen = ref('')
const allRoles = ref([])

let searchTimer = null

const canEdit = computed(() => hasPermission('user_manage'))

onMounted(() => {
  fetchUsers()
  fetchRoles()
})

async function fetchUsers() {
  tableLoading.value = true
  try {
    const res = await getUsers({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      roleId: filterRoleId.value || undefined,
      frozen: filterFrozen.value !== '' ? filterFrozen.value : undefined
    })
    if (res.code === 200) {
      users.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) { /* handled by interceptor */ }
  tableLoading.value = false
}

async function fetchRoles() {
  try {
    const res = await getRoles()
    if (res.code === 200) allRoles.value = res.data || []
  } catch (e) { /* ignore */ }
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchUsers() }, 400)
}

// 弹窗
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const formLoading = ref(false)
const currentEditId = ref(null)

const form = reactive({
  username: '', password: '', realName: '', email: '', phone: '',
  validFrom: '', validUntil: '', locked: 0, roleIds: []
})

const formRules = {
  username: [
    { required: true, message: '请输入用户账号', trigger: 'blur' },
    { min: 2, max: 20, message: '2-20位字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '至少6位', trigger: 'blur' }
  ],
  realName: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

function openCreateDialog() {
  isEdit.value = false
  currentEditId.value = null
  Object.assign(form, { username: '', password: '', realName: '', email: '', phone: '', validFrom: '', validUntil: '', locked: 0, roleIds: [] })
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEdit.value = true
  currentEditId.value = row.id
  Object.assign(form, {
    username: row.username, password: '',
    realName: row.real_name || '',
    email: row.email || '', phone: row.phone || '',
    validFrom: row.valid_from || '', validUntil: row.valid_until || '',
    locked: row.locked || 0,
    roleIds: row.roleCodes ? allRoles.value.filter(r => row.roleCodes.includes(r.code)).map(r => r.id) : []
  })
  dialogVisible.value = true
}

async function submitForm() {
  const vf = formRef.value
  if (!vf) {
    ElMessage.warning('表单加载中，请稍后重试')
    return
  }
  try {
    await vf.validate()
  } catch (e) {
    ElMessage.warning('请完善必填信息后再提交')
    return
  }
  formLoading.value = true
  try {
    const data = {
      realName: form.realName,
      email: form.email,
      phone: form.phone,
      validFrom: form.validFrom,
      validUntil: form.validUntil,
      locked: form.locked,
      roleIds: form.roleIds
    }
    let res
    if (isEdit.value) {
      if (form.password) data.password = form.password
      res = await updateUser(currentEditId.value, data)
    } else {
      data.username = form.username
      data.password = form.password
      res = await createUser(data)
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '用户信息更新成功' : '用户创建成功')
      dialogVisible.value = false
      fetchUsers()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    console.error('提交失败:', e)
    if (e.response) {
      ElMessage.error(e.response.data?.message || '服务器错误')
    } else if (e.request) {
      ElMessage.error('网络连接失败，请检查后端服务是否启动')
    } else {
      ElMessage.error(e.message || '提交失败，请重试')
    }
  } finally {
    formLoading.value = false
  }
}

function resetPassword(row) {
  ElMessageBox.confirm(`确定要重置用户"${row.username}"的密码为 123456 吗？`, '重置密码', { type: 'warning' })
    .then(async () => {
      const res = await resetPwd(row.id)
      if (res.code === 200) ElMessage.success('密码已重置为 123456')
      else ElMessage.error(res.message)
    })
    .catch(() => {})
}

function deleteUser(row) {
  ElMessageBox.confirm(`确定要删除用户"${row.username}"吗？`, '删除用户', { type: 'warning' })
    .then(async () => {
      const res = await delUser(row.id)
      if (res.code === 200) {
        ElMessage.success('用户已删除')
        fetchUsers()
      } else {
        ElMessage.error(res.message)
      }
    })
    .catch(() => {})
}
</script>

<style scoped>
.page-full {
  display: flex;
  flex-direction: column;
  height: 100%;
}
h2 { font-size: 20px; font-weight: 600; color: #1a1a2e; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.search-bar { background: #fff; border-radius: 8px; padding: 14px 20px; margin-bottom: 14px; flex-shrink: 0; border: 1px solid #ebeef5; }
.table-wrap {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #c0c4cc;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.pagination-wrap { padding: 14px 20px; display: flex; justify-content: flex-end; background: #fff; border-top: 1px solid #f0f0f0; border-radius: 0 0 8px 8px; margin-top: -1px; flex-shrink: 0; }
</style>
