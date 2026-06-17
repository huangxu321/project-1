<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2>用户注册</h2>
        <p>创建一个新账号</p>
      </div>
      <el-form :model="form" ref="formRef" :rules="rules" label-position="top">
        <el-form-item label="用户账号（手机号）" prop="username">
          <el-input v-model="form.username" placeholder="用于登录，2-20位字符" size="large" />
        </el-form-item>
        <el-form-item label="用户名" prop="realName">
          <el-input v-model="form.realName" placeholder="登录后显示的名称" size="large" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少6位密码" size="large" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" size="large" show-password />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱（选填）" size="large" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleRegister">注 册</el-button>
        </el-form-item>
        <div style="text-align:center">
          <el-link type="primary" @click="$router.push('/login')">已有账号？去登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '../api/auth'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', realName: '', password: '', confirmPassword: '', email: '' })

const validatePass = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户账号', trigger: 'blur' },
    { min: 2, max: 20, message: '账号长度应在2-20位之间', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 1, max: 20, message: '用户名长度应在1-20位之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePass, trigger: 'blur' }
  ]
}

async function handleRegister() {
  const vf = formRef.value
  if (!vf) return
  try { await vf.validate() } catch (e) { return }
  loading.value = true
  try {
    const res = await register({
      username: form.username,
      realName: form.realName,
      password: form.password,
      email: form.email
    })
    if (res.code === 200) {
      ElMessage.success('注册成功，请登录')
      router.push('/login')
    } else {
      ElMessage.error(res.message || '注册失败')
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
