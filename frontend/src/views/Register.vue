<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <h2>注册账号</h2>
          <p>创建统一用户管理系统账号</p>
        </div>
      </template>
      <div class="login-body">
        <el-form :model="form" ref="formRef" :rules="rules" label-position="top" size="large">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名（2-20位）"/>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="至少6位密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" show-password @keyup.enter="handleRegister"/>
          </el-form-item>
          <el-form-item label="邮箱（选填）" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱"/>
          </el-form-item>
          <el-form-item label="手机号（选填）" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号"/>
          </el-form-item>
          <el-form-item label="真实姓名（选填）">
            <el-input v-model="form.realName" placeholder="请输入姓名"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" style="width: 100%" :loading="loading" @click="handleRegister">注 册</el-button>
          </el-form-item>
          <div style="text-align: center; margin-top: 12px;">
            <router-link to="/login" style="color: #409eff;">已有账号？返回登录</router-link>
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

const form = reactive({ username: '', password: '', confirmPassword: '', email: '', phone: '', realName: '' })

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2-20位之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      }, trigger: 'blur'
    }
  ]
}

async function handleRegister() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const res = await request.post('/auth/register', form)
    if (res.code === 200) {
      ElMessage.success('注册成功，请登录')
      router.push('/login')
    } else {
      ElMessage.error(res.message || '注册失败')
    }
  } catch(e) {
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
