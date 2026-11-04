import axios, { type AxiosError } from 'axios'

type ErrorBody = { error?: string; code?: string; resolution_image_url?: string }

let accessToken: string | null = null

export function setApiToken(token: string | null) {
  accessToken = token
}

export const api = axios.create()

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('civiceye:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ErrorBody>(error)) {
    if (!error.response) return 'The application server could not be reached.'
    return error.response.data?.error || fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function getErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<ErrorBody>(error)) return error.response?.data?.code
  return undefined
}

export function getErrorData(error: unknown): ErrorBody | undefined {
  if (axios.isAxiosError<ErrorBody>(error)) return error.response?.data
  return undefined
}
