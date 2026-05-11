import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardsPage from './pages/DashboardsPage'
import DashboardBuilderPage from './pages/DashboardBuilderPage'
import DataSourcesPage from './pages/DataSourcesPage'
import ReportsPage from './pages/ReportsPage'
import AIChatPage from './pages/AIChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DataPipelinePage from './pages/DataPipelinePage'
import StoriesPage from './pages/StoriesPage'
import AdminPage from './pages/AdminPage'
import AutoMLPage from './pages/AutoMLPage'
import EmbedPage from './pages/EmbedPage'
import ScheduledReportsPage from './pages/ScheduledReportsPage'
import AssetManagementPage from './pages/AssetManagementPage'
import PatchManagementPage from './pages/PatchManagementPage'
import ProbeManagementPage from './pages/ProbeManagementPage'
import AppServerManagementPage from './pages/AppServerManagementPage'
import InfraAutomationPage from './pages/InfraAutomationPage'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboards" replace />} />
          <Route path="dashboards" element={<DashboardsPage />} />
          <Route path="dashboards/:id" element={<DashboardBuilderPage />} />
          <Route path="datasources" element={<DataSourcesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="ai" element={<AIChatPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="pipelines" element={<DataPipelinePage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="automl" element={<AutoMLPage />} />
          <Route path="embed" element={<EmbedPage />} />
          <Route path="scheduled-reports" element={<ScheduledReportsPage />} />
          <Route path="admin" element={<AdminPage />} />
          {/* Infrastructure Management */}
          <Route path="infra/assets"     element={<AssetManagementPage />} />
          <Route path="infra/patches"    element={<PatchManagementPage />} />
          <Route path="infra/probes"     element={<ProbeManagementPage />} />
          <Route path="infra/apps"       element={<AppServerManagementPage />} />
          <Route path="infra/automation" element={<InfraAutomationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
