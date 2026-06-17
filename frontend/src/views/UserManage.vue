<template>
  <div>
    <!-- 页面标题 -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a2e;">子账户管理</h2>
    </div>

    <!-- 工具栏：新建、导出 + 筛选区 -->
    <div style="background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px;">
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 14px;">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon> 新建账号
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
      <!-- 搜索筛选行 -->
      <el-row :gutter="12">
        <el-col :span="6">
          <el-input v-model="filters.keyword" placeholder="账号 / 名称" clearable prefix-icon="Search" size="default"
                    @clear="fetchUsers" @input="debounceFetch"/>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.roleId" placeholder="账号" clearable @change="fetchUsers" style="width:100%">
            <el-option label="全部" value="all"/>
            <el-option v-for="r in roleList" :key="r.id" :label="r.name" :value="r.id"/>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.roleId2" placeholder="用户角色" clearable @change="fetchUsers" style="width:100%">
            <el-option label="全部" value=""/>
            <el-option v-for="r in roleList" :key="r.id" :label="r.name" :value="r.id"/>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.frozen" placeholder="冻结" clearable @change="fetchUsers" style="width:100%">
            <el-option label="否" value="0"/>
            <el-option label="是" value="1"/>
          </el-select>
        </el-col>
        <el-col :span="6" style="text-align: right;">
          <el-link type="primary" @click="showAdvancedFilter = !showAdvancedFilter">
            {{ showAdvancedFilter ? '收起筛选' : '+ 添加筛选' }}
          </el-link>
        </el-col>
      </el-row>

      <!-- 高级筛选（日期范围） -->
      <div v-if="showAdvancedFilter" style="margin-top: 12px;">
        <el-row :gutter="12">
          <el-col :span="10">
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="有效日期开始"
                            end-placeholder="有效日期结束" value-format="YYYY-MM-DD" style="width: 100%;" @change="fetchUsers"/>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 数据表格 -->
    <div style="background: #fff; border-radius: 8px; padding: 0; overflow: hidden;">
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="账号" width="120"/>
        <el-table-column label="员工名称" width="130">
          <template #default="{ row }">{{ row.real_name || '-' }}({{ row.username }})</template>
        </el-table-column>
        <el-table-column label="用户角色" width="140">
          <template #default="{ row }">
            <span>{{ (row.roleNames || []).join('、') || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="160"/>
        <el-table-column prop="phone" label="手机号" width="140"/>
        <el-table-column label="冻结状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.locked === 1 ? 'danger' : 'success'" size="small" effect="light">
              {{ row.locked === 1 ? '冻结' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="valid_until" label="有效日期" width="120"/>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row)">编辑</el-link>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="padding: 14px 20px; display: flex; justify-content: flex-end;">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          :page-sizes="[10, 20, 50]"
          @size-change="fetchUsers"
          @current-change="fetchUsers"
        />
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '账号编辑' : '账号新建'"
      width="780px"
      destroy-on-close
    >
      <UserForm :form-data="formData" :role-list="roleList" ref="userFormRef" />
      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div>
            <el-switch v-if="isEdit" v-model="formData.locked" active-text="冻结" inactive-text="" style="margin-right: 16px;"/>
            <el-button v-if="isEdit" type="warning" plain @click="handleResetPwd">重置密码</el-button>
            <el-button v-if="isEdit" type="info" plain @click="handleChangePwd">修改密码</el-button>
          </div>
          <div>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="420px" destroy-on-close>
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="90px">
        <el-form-item label="新密码" prop="password">
          <el-input v-model="pwdForm.password" type="password" show-password placeholder="请输入新密码(至少6位)"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import UserForm from '../components/UserForm.vue'

const loading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const showAdvancedFilter = ref(false)
const dateRange = ref(null)
const userFormRef = ref(null)
const pwdDialogVisible = ref(false)
const pwdFormRef = ref(null)

const roleList = ref([])

const filters = reactive({
  keyword: '',
  roleId: '',
  roleId2: '',
  frozen: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单数据模板
function getEmptyForm() {
  return {
    username: '', password: '', email: '', phone: '', realName: '',
    employeeId: '', userType: 'platform', validFrom: '', validUntil: '', locked: false, roleIds: []
  }
}
const formData = ref(getEmptyForm())
const pwdForm = reactive({ password: '' })
const pwdRules = {
  password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }]
}

let debounceTimer = null
function debounceFetch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchUsers, 400) }

async function fetchRoles() {
  const res = await request.get('/roles')
  if (res.code === 200) roleList.value = res.data
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword || undefined,
      roleId: filters.roleId2 || undefined,
      frozen: filters.frozen || undefined
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.validFrom = dateRange.value[0]
      params.validUntil = dateRange.value[1]
    }
    const res = await request.get('/users', { params })
    if (res.code === 200) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } finally { loading.value = false }
}

function handleCreate() {
  isEdit.value = false
  formData.value = getEmptyForm()
  dialogVisible.value = true
}

async function handleEdit(row) {
  isEdit.value = true
  const res = await request.get('/users/' + row.id)
  if (res.code === 200) {
    const d = res.data
    formData.value = {
      id: d.id, username: d.username, email: d.email, phone: d.phone,
      realName: d.real_name, employeeId: d.employee_id, userType: d.user_type,
      validFrom: d.valid_from, validUntil: d.valid_until,
      locked: d.locked === 1, roleIds: (d.roles || []).map(r => r.id)
    }
    dialogVisible.value = true
  }
}

async function handleSubmit() {
  const valid = await userFormRef.value?.validate().catch(() => false)
  if (!valid && !isEdit.value) return

  const payload = {
    ...formData.value,
    locked: formData.value.locked ? 1 : 0
  }

  try {
    let res
    if (isEdit.value) {
      delete payload.password
      res = await request.put('/users/' + payload.id, payload)
    } else {
      res = await request.post('/users', payload)
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchUsers()
    } else ElMessage.error(res.message)
  } catch(e) { ElMessage.error('操作失败') }
}

async function handleResetPwd() {
  try {
    await ElMessageBox.confirm('确定要将该用户的密码重置为默认密码 123456 吗？', '重置密码', { type: 'warning' })
    const res = await request.post('/users/' + formData.value.id + '/reset-password')
    if (res.code === 200) { ElMessage.success('已重置为 123456') } else ElMessage.error(res.message)
  } catch(e) {}
}

function handleChangePwd() { pwdForm.password = ''; pwdDialogVisible.value = true }

async function submitChangePwd() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  const res = await request.put('/users/' + formData.value.id + '/password', { newPassword: pwdForm.password })
  if (res.code === 200) { ElMessage.success('密码修改成功'); pwdDialogVisible.value = false }
  else ElMessage.error(res.message)
}

function handleExport() { ElMessage.info('导出功能开发中...') }

onMounted(() => { fetchRoles(); fetchUsers() })
</script>
