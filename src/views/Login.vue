<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: ['input', 'blur'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['input', 'blur'] }],
}

async function onLogin() {
  await formRef.value?.validate()
  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    await router.push('/')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="left">
      <div class="left-content">
        <svg class="hero" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
          <rect x="60" y="80" width="280" height="180" rx="28" fill="#1e3a5f" opacity="0.2" />
          <rect x="90" y="100" width="220" height="140" rx="20" fill="#1e40af" opacity="0.25" />
          <rect x="120" y="130" width="160" height="80" rx="14" fill="#3b82f6" opacity="0.35" />
          <circle cx="200" cy="170" r="30" fill="#60a5fa" opacity="0.6" />
          <circle cx="120" cy="200" r="24" fill="#93c5fd" />
          <circle cx="280" cy="210" r="18" fill="#60a5fa" />
          <path d="M70 120h80m-60 20h80m-40 20h80" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round" />
        </svg>
        <div class="brand">Argus WMS 智能仓储管理系统</div>
      </div>
    </div>

    <div class="right">
      <div class="form-card">
        <h2 class="title">Hello! 欢迎登录。</h2>
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <n-form-item path="username">
            <n-input v-model:value="form.username" placeholder="请输入账号" />
          </n-form-item>
          <n-form-item path="password">
            <n-input
              v-model:value="form.password"
              placeholder="请输入密码"
              type="password"
              show-password-on="click"
              @keyup.enter="onLogin"
            />
          </n-form-item>
          <n-button type="primary" class="login-btn" :loading="loading" @click="onLogin">
            登录
          </n-button>
        </n-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  background: #f8fafc;
}

.left {
  flex: 0 0 60%;
  background: linear-gradient(135deg, #0b1220, #0f172a 50%, #0b3b88);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dbeafe;
}

.left-content {
  text-align: center;
  padding: 32px;
}

.hero {
  width: min(420px, 70%);
  margin-bottom: 24px;
}

.brand {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.right {
  flex: 0 0 40%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  width: min(360px, 80%);
}

.title {
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.login-btn {
  width: 100%;
  border-radius: 999px;
  margin-top: 8px;
}
</style>
