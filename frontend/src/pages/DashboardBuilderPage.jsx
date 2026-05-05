import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { RiAddLine, RiArrowLeftLine, RiShareLine } from 'react-icons/ri'
import { dashboardAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'
import WidgetCard from '../components/Dashboard/WidgetCard'
import AddWidgetModal from '../components/Dashboard/AddWidgetModal'

export default function DashboardBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [datasources, setDatasources] = useState([])
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchDatasources()])
  }, [id])

  const fetchDashboard = async () => {
    try {
      const { data } = await dashboardAPI.get(id)
      setDashboard(data)
    } catch {
      toast.error('Dashboard not found')
      navigate('/dashboards')
    } finally {
      setLoading(false)
    }
  }

  const fetchDatasources = async () => {
    try {
      const { data } = await datasourceAPI.list()
      setDatasources(data)
    } catch { /* skip */ }
  }

  const handleShare = async () => {
    const { data } = await dashboardAPI.share(id)
    if (data.share_token) {
      const url = `${window.location.origin}/share/${data.share_token}`
      navigator.clipboard.writeText(url)
      toast.success('Share link copied to clipboard!')
    } else {
      toast('Dashboard set to private')
    }
    fetchDashboard()
  }

  const handleWidgetAdded = (widget) => {
    setDashboard((d) => ({ ...d, widgets: [...(d.widgets || []), widget] }))
    setShowAddWidget(false)
    toast.success('Widget added!')
  }

  const handleDeleteWidget = async (widgetId) => {
    await dashboardAPI.deleteWidget(id, widgetId)
    setDashboard((d) => ({ ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }))
    toast.success('Widget removed')
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>
  if (!dashboard) return null

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboards')} className="text-gray-500 hover:text-gray-900">
            <RiArrowLeftLine className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
            {dashboard.description && <p className="text-gray-500 text-sm">{dashboard.description}</p>}
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2" onClick={handleShare}>
            <RiShareLine /> {dashboard.is_public ? 'Unshare' : 'Share'}
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddWidget(true)}>
            <RiAddLine /> Add Widget
          </button>
        </div>
      </div>

      {/* Widget grid */}
      {!dashboard.widgets?.length ? (
        <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500 font-medium">No widgets yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Widget" to start building your dashboard</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {dashboard.widgets.map((widget) => (
            <WidgetCard key={widget.id} widget={widget} onDelete={() => handleDeleteWidget(widget.id)} />
          ))}
        </div>
      )}

      {showAddWidget && (
        <AddWidgetModal
          dashboardId={id}
          datasources={datasources}
          onAdd={handleWidgetAdded}
          onClose={() => setShowAddWidget(false)}
        />
      )}
    </div>
  )
}
