import axios from 'axios'

// VITE_API_URL is baked in at build time.
// Fallback: the known Render backend URL so the app works even without the env var.
const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  'https://analyticsforge-backend.onrender.com'

const BASE_URL = `${BACKEND_URL}/api`

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('af_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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

export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams({ username: email, password })
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  setLanguage: (lang) => api.patch(`/auth/me/language?language=${lang}`),
}

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

export const dashboardAPI = {
  list: () => api.get('/dashboards/'),
  create: (data) => api.post('/dashboards/', data),
  get: (id) => api.get(`/dashboards/${id}`),
  update: (id, data) => api.patch(`/dashboards/${id}`, data),
  delete: (id) => api.delete(`/dashboards/${id}`),
  share: (id) => api.post(`/dashboards/${id}/share`),
  addWidget: (dashboardId, data) => api.post(`/dashboards/${dashboardId}/widgets`, data),
  updateWidget: (dashboardId, widgetId, data) => api.patch(`/dashboards/${dashboardId}/widgets/${widgetId}`, data),
  deleteWidget: (dashboardId, widgetId) => api.delete(`/dashboards/${dashboardId}/widgets/${widgetId}`),
}

export const reportAPI = {
  list: () => api.get('/reports/'),
  create: (data) => api.post('/reports/', data),
  get: (id) => api.get(`/reports/${id}`),
  delete: (id) => api.delete(`/reports/${id}`),
  export: (id) => api.get(`/reports/${id}/export`, { responseType: 'blob' }),
}

export const aiAPI = {
  chat: (question, messages, datasource_id) =>
    api.post('/ai/chat', { question, messages, datasource_id }),
  nlToSql: (datasource_id, question) =>
    api.post('/ai/nl-to-sql', { datasource_id, question }),
  insights: (datasource_id, query, question) =>
    api.post('/ai/insights', { datasource_id, query, question }),
  anomalyDetect: (datasource_id, query) =>
    api.post('/ai/anomaly-detect', { datasource_id, query }),
  generateDashboard: (requirements) =>
    api.post('/ai/generate-dashboard', { requirements }),
  refineDashboard: (current_config, feedback) =>
    api.post('/ai/refine-dashboard', { current_config, feedback }),
}

export const analyticsAPI = {
  forecast: (data) => api.post('/analytics/forecast', data),
  stats: (data) => api.post('/analytics/stats', data),
}

export const collaborationAPI = {
  listTeams: () => api.get('/collaboration/teams'),
  createTeam: (data) => api.post('/collaboration/teams', data),
  addMember: (teamId, data) => api.post(`/collaboration/teams/${teamId}/members`, data),
  getMembers: (teamId) => api.get(`/collaboration/teams/${teamId}/members`),
  getComments: (dashboardId) => api.get(`/collaboration/dashboards/${dashboardId}/comments`),
  addComment: (dashboardId, data) => api.post(`/collaboration/dashboards/${dashboardId}/comments`, data),
  resolveComment: (commentId) => api.patch(`/collaboration/comments/${commentId}/resolve`),
  deleteComment: (commentId) => api.delete(`/collaboration/comments/${commentId}`),
}

export const pipelineAPI = {
  list: () => api.get('/pipelines/'),
  create: (data) => api.post('/pipelines/', data),
  get: (id) => api.get(`/pipelines/${id}`),
  delete: (id) => api.delete(`/pipelines/${id}`),
  run: (id, data) => api.post(`/pipelines/${id}/run`, data),
}

export const storiesAPI = {
  list: () => api.get('/stories/'),
  create: (data) => api.post('/stories/', data),
  get: (id) => api.get(`/stories/${id}`),
  delete: (id) => api.delete(`/stories/${id}`),
  addSlide: (storyId, data) => api.post(`/stories/${storyId}/slides`, data),
  deleteSlide: (storyId, slideId) => api.delete(`/stories/${storyId}/slides/${slideId}`),
  share: (id) => api.post(`/stories/${id}/share`),
}

export const embedAPI = {
  listTokens: () => api.get('/embed/tokens'),
  createToken: (data) => api.post('/embed/tokens', data),
  revokeToken: (id) => api.delete(`/embed/tokens/${id}`),
  getSnippet: (id) => api.get(`/embed/snippet/${id}`),
}

export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getStats: () => api.get('/admin/stats'),
}

export const automlAPI = {
  train: (data) => api.post('/automl/train', data),
  cluster: (data) => api.post('/automl/cluster', data),
}

export const scheduledReportsAPI = {
  list: () => api.get('/scheduled-reports/'),
  create: (data) => api.post('/scheduled-reports/', data),
  toggle: (id) => api.patch(`/scheduled-reports/${id}/toggle`),
  delete: (id) => api.delete(`/scheduled-reports/${id}`),
  runNow: (id) => api.post(`/scheduled-reports/${id}/run-now`),
  getExecutions: (id) => api.get(`/scheduled-reports/${id}/executions`),
}

export default api
