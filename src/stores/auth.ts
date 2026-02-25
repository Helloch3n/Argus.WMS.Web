import { defineStore } from 'pinia'
import axios from 'axios'

const TOKEN_STORAGE_KEY = 'auth_token'
const USER_STORAGE_KEY = 'auth_user'

export type AuthUserInfo = {
  username: string
  // 如需扩展可加：id?: string; name?: string; roles?: string[]; ...
}

type OAuthTokenResponse = {
  access_token: string
  token_type?: string
  expires_in?: number
  scope?: string
  refresh_token?: string
}

function readUserFromStorage(): AuthUserInfo | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUserInfo
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: (localStorage.getItem(TOKEN_STORAGE_KEY) as string | null) ?? null,
    user: readUserFromStorage(),
  }),

  actions: {    
    async login(username: string, password: string) {
      const baseURL = import.meta.env.VITE_API_URL ?? ''

      const form = new URLSearchParams()
      form.set('grant_type', 'password')
      form.set('client_id', 'WMS_App')
      form.set('scope', 'WMS')
      form.set('username', username)
      form.set('password', password)

      const { data } = await axios.post<OAuthTokenResponse>('/connect/token', form, {
        baseURL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const accessToken = data?.access_token
      if (!accessToken) throw new Error('登录失败：未返回 access_token')

      this.token = accessToken
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)

      // 这里先保存最基础的 user info；如你后端有“获取当前用户信息”的接口，可在这里再请求并覆盖
      this.user = { username }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user))

      return accessToken
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
    },
  },
})
