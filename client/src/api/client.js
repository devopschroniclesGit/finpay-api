import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
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
}

export const accountAPI = {
  getAccount: () => api.get('/accounts/me'),
  topUp:      (amount) => api.post('/accounts/topup', { amount }),
}

export const transactionAPI = {
  send: (data) => api.post('/transactions/send', data, {
    headers: { 'Idempotency-Key': crypto.randomUUID() }
  }),
  history: (page = 1) => api.get(`/transactions/history?page=${page}&limit=10`),
}

export default api
