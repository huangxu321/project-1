<template>
  <div>
    <div class="section-header">
      <h2>系统配置</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon> 添加系统
      </el-button>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-bar">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input v-model="keyword" placeholder="请输入系统名称" clearable />
        </el-col>
        <el-col :span="4">
          <el-select v-model="enabledFilter" placeholder="是否启用" clearable style="width:100%">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <!-- 系统列表 -->
    <div class="table-wrap" v-loading="tableLoading">
      <table class="plain-table plain-table--stripe">
        <thead>
          <tr>
            <th style="min-width:200px">系统名称</th>
            <th style="min-width:320px">系统链接</th>
            <th style="min-width:110px" class="align-center">是否启用</th>
            <th style="min-width:150px" class="align-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredSystems" :key="row.id">
            <td>{{ row.name }}</td>
            <td>
              <a :href="row.access_url" target="_blank" class="link">{{ row.access_url }}</a>
            </td>
            <td class="align-center">
              <el-switch :model-value="row.status === 1" @change="toggleEnabled(row, $event)" />
            </td>
            <td class="align-center">
              <el-link type="primary" style="margin-right:10px" @click="openEditDialog(row)">编辑</el-link>
              <el-link type="danger" @click="deleteSystem(row)">删除</el-link>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredSystems.length" style="text-align:center;padding:60px;color:#999">
        <el-empty description="暂无已配置的系统" :image-size="80" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑系统' : '添加系统'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="系统名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入系统名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="系统编码" prop="code">
          <el-input v-model="form.code" placeholder="英文/数字/下划线" :disabled="isEdit" maxlength="50" />
        </el-form-item>
        <el-form-item label="访问地址" prop="accessUrl">
          <el-input v-model="form.accessUrl" placeholder="如 https://example.com" maxlength="200" />
        </el-form-item>
        <el-form-item label="系统描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填" maxlength="200" show-word-limit />
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
import { computed, reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSystems, createSystem, updateSystem, deleteSystem as delSystem } from '../api/systems'

const systems = ref([])
const tableLoading = ref(false)
const keyword = ref('')
const enabledFilter = ref('')

const filteredSystems = computed(() => {
  let list = [...systems.value]
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s => s.name.toLowerCase().includes(kw))
  }
  if (enabledFilter.value !== '' && enabledFilter.value !== null && enabledFilter.value !== undefined) {
    list = list.filter(s => s.status === enabledFilter.value)
  }
  return list
})

onMounted(() => { fetchSystems() })

async function fetchSystems() {
  tableLoading.value = true
  try {
    const res = await getSystems()
    if (res.code === 200) systems.value = res.data || []
  } catch (e) { /* ignore */ }
  tableLoading.value = false
}

async function toggleEnabled(row, val) {
  try {
    const res = await updateSystem(row.id, { status: val ? 1 : 0 })
    if (res.code === 200) {
      row.status = val ? 1 : 0
      ElMessage.success(val ? '系统已启用' : '系统已禁用')
    }
  } catch (e) { /* ignore */ }
}

// 弹窗
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const formLoading = ref(false)
const currentEditId = ref(null)
const form = reactive({ code: '', name: '', accessUrl: '', description: '' })

const formRules = {
  name: [{ required: true, message: '请输入系统名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入系统编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: '编码需以字母开头，可包含字母、数字、下划线、连字符', trigger: 'blur' }
  ],
  accessUrl: [{ required: true, message: '请输入访问地址', trigger: 'blur' }]
}

function openCreateDialog() {
  isEdit.value = false
  currentEditId.value = null
  Object.assign(form, { code: '', name: '', accessUrl: '', description: '' })
  dialogVisible.value = true
}

function openEditDialog(row) {
  isEdit.value = true
  currentEditId.value = row.id
  Object.assign(form, {
    code: row.code, name: row.name,
    accessUrl: row.access_url, description: row.description || ''
  })
  dialogVisible.value = true
}

async function submitForm() {
  const vf = formRef.value
  if (!vf) return
  try { await vf.validate() } catch (e) { return }
  formLoading.value = true
  try {
    const data = { name: form.name, accessUrl: form.accessUrl, description: form.description }
    let res
    if (isEdit.value) {
      res = await updateSystem(currentEditId.value, { ...data, code: form.code })
    } else {
      res = await createSystem({ ...data, code: form.code })
    }
    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '系统信息更新成功' : '系统添加成功')
      dialogVisible.value = false
      fetchSystems()
    } else {
      ElMessage.error(res.message)
    }
  } catch (e) { /* ignore */ }
  formLoading.value = false
}

async function deleteSystem(row) {
  ElMessageBox.confirm(`确定要删除系统"${row.name}"吗？`, '删除系统', { type: 'warning' })
    .then(async () => {
      const res = await delSystem(row.id)
      if (res.code === 200) {
        ElMessage.success('系统已删除')
        fetchSystems()
      } else {
        ElMessage.error(res.message)
      }
    })
    .catch(() => {})
}
</script>

<style scoped>
h2 { font-size: 20px; font-weight: 600; color: #1a1a2e; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.search-bar { background: #fff; border-radius: 8px; padding: 14px 20px; margin-bottom: 14px; }
.link { color: #409eff; text-decoration: none; }
.link:hover { text-decoration: underline; }
</style>
