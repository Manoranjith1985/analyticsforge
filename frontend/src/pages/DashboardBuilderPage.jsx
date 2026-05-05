import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  RiAddLine, RiArrowLeftLine, RiShareLine, RiSave3Line,
  RiPaletteLine, RiMessage2Line, RiEyeOffLine
} from 'react-icons/ri'
import { dashboardAPI, datasourceAPI, collaborationAPI } from '../services/api'
import toast from 'react-hot-toast'
import WidgetCard from '../components/Dashboard/WidgetCard'
import AddWidgetModal from '../components/Dashboard/AddWidgetModal'
import CommentsPanel from '../components/Collaboration/CommentsPanel'

const THEMES = {
  light:     { bg: 'bg-gray-50',  card: 'bg-white',  text: 'text-gray-900', border: 'border-gray-200' },
  dark:      { bg: 'bg-gray-900', card: 'bg-gray-800', text: 'text-white', border: 'border-gray-700' },
  corporate: { bg: 'bg-slate-100', card: 'bg-white', text: 'text-slate-900', border: 'border-slate-200' },
  vibrant:   { bg: 'bg-purple-50', card: 'bg-white', text: 'text-purple-900', border: 'border-purple-200' },
}

export default function DashboardBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [datasources, setDatasources] = useState([])
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState([])
  const [theme, setTheme] = useState('light')
  const [containerWidth, setContainerWidth] = useState(1200)

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchDatasources()])
    const updateWidth = () => setContainerWidth(window.innerWidth - 280)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [id])

  const fetchDashboard = async () => {
    try {
      const { data } = await dashboardAPI.get(id)
      setDashboard(data)
      setTheme(data.theme || 'light')
      setLayout((data.widgets || []).map((w) => ({
        i: w.id, x: w.position_x || 0, y: w.position_y || 0,
        w: w.width || 4, h: w.height || 3, minW: 2, minH: 2,
      })))
    } catch {
      toast.error('Dashboard not found')
      navigate('/dashboards')
    } finally { setLoading(false) }
  }

  const fetchDatasources = async () => {
    try { const { data } = await datasourceAPI.list(); setDatasources(data) } catch {}
  }

  const handleLayoutChange = useCallback(async (newLayout) => {
    setLayout(newLayout)
    // Persist position changes
    for (const item of newLayout) {
      await dashboardAPI.updateWidget(id, item.i, {
        position_x: item.x, position_y: item.y, width: item.w, height: item.h
      }).catch(() => {})
    }
  }, [id])

  const handleShare = async () => {
    const { data } = await dashboardAPI.share(id)
    if (data.share_token) {
      const url = `${window.location.origin}/embed/${data.share_token}`
      navigator.clipboard.writeText(url)
      toast.success('Share link copied!')
    } else {
      toast('Dashboard set to private')
    }
    fetchDashboard()
  }

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme)
    await dashboardAPI.update(id, { theme: newTheme }).catch(() => {})
  }

  const handleWidgetAdded = (widget) => {
    setDashboard((d) => ({ ...d, widgets: [...(d.widgets || []), widget] }))
    setLayout((l) => [...l, {
      i: widget.id, x: 0, y: Infinity, w: widget.width || 4, h: widget.height || 3, minW: 2, minH: 2
    }])
    setShowAddWidget(false)
    toast.success('Widget added!')
  }

  const handleDeleteWidget = async (widgetId) => {
    await dashboardAPI.deleteWidget(id, widgetId)
    setDashboard((d) => ({ ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }))
    setLayout((l) => l.filter((item) => item.i !== widgetId))
    toast.success('Widget removed')
  }

  const themeClasses = THEMES[theme] || THEMES.light

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>
  if (!dashboard) return null

  return (
    <div className={`min-h-screen ${themeClasses.bg} -m-6 p-6`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between mb-6 pb-4 border-b ${themeClasses.border}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboards')} className="text-gray-500 hover:text-gray-900">
            <RiArrowLeftLine className="text-xl" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${themeClasses.text}`}>{dashboard.name}</h1>
            {dashboard.description && <p className="text-gray-500 text-sm">{dashboard.description}</p>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Theme picker */}
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-white">
            {Object.keys(THEMES).map((t) => (
              <button key={t} onClick={() => handleThemeChange(t)}
                className={`w-6 h-6 rounded text-xs font-medium transition-all ${theme === t ? 'ring-2 ring-primary-600' : 'opacity-60'}`}
                style={{ background: t === 'dark' ? '#1f2937' : t === 'vibrant' ? '#7c3aed' : t === 'corporate' ? '#0f172a' : '#fff', border: '1px solid #e5e7eb' }}
                title={t} />
            ))}
          </div>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setShowComments(!showComments)}>
            <RiMessage2Line /> Comments
          </button>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={handleShare}>
            <RiShareLine /> {dashboard.is_public ? 'Unshare' : 'Share'}
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowAddWidget(true)}>
            <RiAddLine /> Add Widget
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main canvas */}
        <div className="flex-1">
          {!dashboard.widgets?.length ? (
            <div className={`text-center py-24 border-2 border-dashed rounded-2xl ${themeClasses.border}`}>
              <p className={`font-medium ${themeClasses.text}`}>No widgets yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Widget" to start building</p>
              <button className="btn-primary mt-4" onClick={() => setShowAddWidget(true)}>
                <RiAddLine className="inline mr-1" /> Add First Widget
              </button>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={80}
              width={containerWidth}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              margin={[12, 12]}
            >
              {dashboard.widgets.map((widget) => (
                <div key={widget.id} className={`${themeClasses.card} rounded-xl border ${themeClasses.border} shadow-sm overflow-hidden`}>
                  <WidgetCard
                    widget={widget}
                    theme={theme}
                    onDelete={() => handleDeleteWidget(widget.id)}
                  />
                </div>
              ))}
            </GridLayout>
          )}
        </div>

        {/* Comments sidebar */}
        {showComments && (
          <div className="w-80 flex-shrink-0">
            <CommentsPanel dashboardId={id} onClose={() => setShowComments(false)} />
          </div>
        )}
      </div>

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
