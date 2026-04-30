import axios from 'axios'

// Safe UUID generator that works in all environments
const generateUUID = () => {
  try {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID()
    }
  } catch (_) {}
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.56.11:3000/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
  logout:   ()     => api.post('/auth/logout'),
}

export const accountAPI = {
  getAccount: () => api.get('/accounts/me'),
  topUp:      (amount) => api.post('/accounts/topup', { amount }),
}

export const transactionAPI = {
  send: (data) => {
    const key = generateUUID()
    console.log('Idempotency key:', key)
    return api.post('/transactions/send', data, {
      headers: { 'Idempotency-Key': key }
    })
  },
  history: (page = 1) => api.get(`/transactions/history?page=${page}&limit=10`),
  getOne:  (id) => api.get(`/transactions/${id}`),
}

export default api
