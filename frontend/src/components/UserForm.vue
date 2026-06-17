<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
    <!-- 基本参数折叠面板 -->
    <el-collapse v-model="activeCollapse">
      <el-collapse-item title="基本参数" name="basic">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="账号" prop="username">
              <el-input v-model="form.username" placeholder="请输入账号" :disabled="isEdit"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="用户类型">
              <el-input v-model="form.userType" disabled placeholder="平台用户"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="手机号码" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="员工名称">
              <el-input v-model="form.employeeId" placeholder="尚未设置"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="* 名称" prop="realName">
              <el-input v-model="form.realName" placeholder="请输入名称"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="* 有效日期">
              <el-date-picker v-model="form.validFrom" type="date" placeholder="请选择" value-format="YYYY-MM-DD"
                              style="width: 100%;"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="有效日期至">
              <el-date-picker v-model="form.validUntil" type="date" placeholder="请选择" value-format="YYYY-MM-DD"
                              style="width: 100%;"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="锁定">
              <el-radio-group v-model="form.locked">
                <el-radio :value="false">否</el-radio>
                <el-radio :value="true">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 密码字段（仅新建时显示） -->
        <el-row :gutter="20" v-if="!isEdit">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="请输入密码（至少6位）"/>
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>

      <!-- 分配角色 -->
      <el-collapse-item name="roles">
        <template #title><span style="color: #409eff; font-weight: 500;">分配角色</span></template>
        <div style="padding: 10px 0;">
          <el-checkbox-group v-model="form.roleIds">
            <div v-for="(r, idx) in roleList" :key="r.id" :style="{ display: 'inline-block', width: '25%', marginBottom: '10px' }">
              <el-checkbox :label="r.id">{{ r.name }}</el-checkbox>
            </div>
          </el-checkbox-group>
          <div v-if="!roleList.length" style="color: #999;">暂无角色，请先在角色管理中创建</div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ formData: { type: Object, required: true }, roleList: { type: Array, default: () => [] } })
const formRef = ref(null)
const activeCollapse = ref(['basic', 'roles'])

const form = computed(() => props.formData)
const isEdit = computed(!!form.value.id)

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

function validate() {
  return formRef.value?.validate().catch(() => false)
}

defineExpose({ validate })
</script>
