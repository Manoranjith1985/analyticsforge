import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('af_token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.login(email, password)
      localStorage.setItem('af_token', data.access_token)
      set({ token: data.access_token, user: data.user, isLoading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', isLoading: false })
      return false
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.register(userData)
      set({ isLoading: false })
      return { success: true, data }
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Registration failed', isLoading: false })
      return { success: false }
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await authAPI.me()
      set({ user: data })
    } catch {
      set({ user: null, token: null })
      localStorage.removeItem('af_token')
    }
  },

  logout: () => {
    localStorage.removeItem('af_token')
    set({ user: null, token: null })
  },

  setLanguage: async (lang) => {
    await authAPI.setLanguage(lang)
    set((state) => ({ user: { ...state.user, preferred_language: lang } }))
  },
}))

export default useAuthStore
