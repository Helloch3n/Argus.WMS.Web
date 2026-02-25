import axios, { AxiosError, type AxiosResponse } from 'axios'
import { http } from './http'

/**
 * 统一导出唯一实例，避免重复注册响应拦截器
 */
const request = http

export default request
export { request }

type AbpErrorPayload = {
  error?: {
    message?: string
    details?: string
  }
}

function getAbpErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const payload = data as AbpErrorPayload
  const message = payload.error?.message?.trim()
  const details = payload.error?.details?.trim()
  if (!message) return null
  return details ? `${message}: ${details}` : message
}

function getHttpErrorMessage(status?: number): string {
  if (status === 400) return '400: 请求参数错误'
  if (status === 401) return '401: 未登录或登录已过期'
  if (status === 403) return '403: 拒绝访问'
  if (status === 404) return '404: 资源不存在'
  if (status === 500) return '500: 服务器内部错误'
  return '网络错误'
}

request.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const response = error.response
    const abpMessage = getAbpErrorMessage(response?.data)

    if (abpMessage) {
      window.$message?.error(abpMessage)
      error.message = abpMessage
      return Promise.reject(error)
    }

    const fallback = getHttpErrorMessage(response?.status)
    window.$message?.error(fallback)
    error.message = fallback
    return Promise.reject(error)
  },
)