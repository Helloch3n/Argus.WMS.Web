import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { createDiscreteApi } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

type AbpErrorBody = {
  error?: {
    message?: string
    details?: string
  }
}

function tryParseJson(data: unknown): unknown {
  if (typeof data !== 'string') return data
  const text = data.trim()
  if (!text) return data
  try {
    return JSON.parse(text) as unknown
  } catch {
    return data
  }
}

function getAbpBusinessError(data: unknown): { message: string; details?: string } | null {
  const parsed = tryParseJson(data)
  if (!parsed || typeof parsed !== 'object') return null

  const body = parsed as AbpErrorBody
  const message = body.error?.message?.trim()
  const details = body.error?.details?.trim()

  if (!message) return null
  return { message, details: details || undefined }
}

function getHttpStatusMessage(status?: number): string {
  if (status === 400) return '请求参数错误'
  if (status === 401) return '未登录或登录已过期'
  if (status === 403) return '拒绝访问'
  if (status === 404) return '请求资源不存在'
  if (status === 500) return '服务器内部错误'
  return '请求失败'
}

function resolveFallbackErrorMessage(error: AxiosError): string {
  if (error.code === 'ERR_NETWORK') return '网络错误，请检查网络连接'
  const status = error.response?.status
  if (typeof status === 'number') return `${status}: ${getHttpStatusMessage(status)}`
  return error.message?.trim() || '请求失败'
}

function redirectToLogin() {
  if (window.location.pathname === '/login') return
  window.location.replace('/login')
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

const { message: notify } = createDiscreteApi(['message'])

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const authStore = useAuthStore()
  const token = authStore.token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const abpError = getAbpBusinessError(error.response?.data)

    if (abpError?.message) {
      const text = abpError.details ? `${abpError.message}: ${abpError.details}` : abpError.message
      notify.error(text)
      error.message = text

      if (status === 401) {
        const authStore = useAuthStore()
        authStore.logout()
        redirectToLogin()
      }
      return Promise.reject(error)
    }

    const fallbackMessage = resolveFallbackErrorMessage(error)
    notify.error(fallbackMessage)
    error.message = fallbackMessage

    if (status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      redirectToLogin()
    }

    return Promise.reject(error)
  },
)
