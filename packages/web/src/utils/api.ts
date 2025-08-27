import axios from 'axios'

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('kidqueue_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kidqueue_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api