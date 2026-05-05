import axios from 'axios'

// In development, Vite proxies /api → localhost:8000
// In production on Render, VITE_API_URL is set to the backend's Render URL
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('af_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('af_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams({ username: email, password })
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  setLanguage: (lang) => api.patch(`/auth/me/language?language=${lang}`),
}

// ── Data Sources ──────────────────────────────────────────────────────────────
export const datasourceAPI = {
  list: () => api.get('/datasources/'),
  create: (data) => api.post('/datasources/', data),
  get: (id) => api.get(`/datasources/${id}`),
  delete: (id) => api.delete(`/datasources/${id}`),
  query: (id, query) => api.post(`/datasources/${id}/query`, { query }),
  schema: (id) => api.get(`/datasources/${id}/schema`),
  uploadCsv: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/datasources/upload/csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── Dashboards ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  list: () => api.get('/dashboards/'),
  create: (data) => api.post('/dashboards/', data),
  get: (id) => api.get(`/dashboards/${id}`),
  delete: (id) => api.delete(`/dashboards/${id}`),
  share: (id) => api.post(`/dashboards/${id}/share`),
  addWidget: (dashboardId, data) => api.post(`/dashboards/${dashboardId}/widgets`, data),
  updateWidget: (dashboardId, widgetId, data) => api.patch(`/dashboards/${dashboardId}/widgets/${widgetId}`, data),
  deleteWidget: (dashboardId, widgetId) => api.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportAPI = {
  list: () => api.get('/reports/'),
  create: (data) => api.post('/reports/', data),
  get: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
  export: (id) => api.get(`/reports/${id}/export`, { responseType: 'blob' }),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  chat: (question, messages, datasource_id) =>
    api.post('/ai/chat', { question, messages, datasource_id }),
  nlToSql: (datasource_id, question) =>
    api.post('/ai/nl-to-sql', { datasource_id, question }),
  insights: (datasource_id, query, question) =>
    api.post('/ai/insights', { datasource_id, query, question }),
  anomalyDetect: (datasource_id, query) =>
    api.post('/ai/anomaly-detect', { datasource_id, query }),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  forecast: (data) => api.post('/analytics/forecast', data),
  stats: (data) => api.post('/analytics/stats', data),
}

export default api
