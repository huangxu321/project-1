<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2>统一用户管理系统</h2>
        <p>请使用账号密码登录系统</p>
      </div>
      <el-form :model="form" ref="formRef" :rules="rules" label-position="top">
        <el-form-item label="用户账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" size="large" @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form-item>
        <div style="text-align:center;margin-top:12px">
          <el-link type="primary" @click="$router.push('/register')">没有账号？立即注册</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../api/auth'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const vf = formRef.value
  if (!vf) return
  try { await vf.validate() } catch (e) { return }
  loading.value = true
  try {
    const res = await login(form.username, form.password)
    if (res.code === 200) {
      localStorage.setItem('auth_token', res.data.token)
      localStorage.setItem('user_info', JSON.stringify(res.data.userInfo))
      ElMessage.success('登录成功')
      router.push('/app/users')
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch (e) {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 50%, #c3d9f7 100%);
}
.login-card {
  width: 420px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  background: #fff;
  padding: 40px;
}
.login-header {
  text-align: center;
  margin-bottom: 24px;
}
.login-header h2 {
  font-size: 24px;
  color: #1e3a5f;
  margin-bottom: 4px;
}
.login-header p {
  font-size: 14px;
  color: #909399;
}
</style>
