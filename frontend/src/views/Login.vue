<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>统一用户管理系统</h2>
          <p>请使用账号密码登录系统</p>
        </div>
      </template>
      <div class="login-body">
        <el-form :model="form" ref="formRef" :rules="rules" label-position="top">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" prefix-icon="User" placeholder="请输入用户名" size="large" @keyup.enter="handleLogin"/>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" prefix-icon="Lock" placeholder="请输入密码" size="large"
                      show-password @keyup.enter="handleLogin"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
              登 录
            </el-button>
          </el-form-item>
          <div style="text-align: center; margin-top: 12px;">
            <router-link to="/register" style="color: #409eff; font-size: 14px;">没有账号？立即注册</router-link>
          </div>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await request.post('/auth/login', { username: form.username, password: form.password })
    if (res.code === 200) {
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('userInfo', JSON.stringify(res.data.userInfo))
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch(e) {
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
