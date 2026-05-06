import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RiAddLine, RiDashboardLine, RiDeleteBinLine,
  RiSparklingLine, RiEdit2Line, RiCloseLine,
  RiBarChartLine, RiCheckLine
} from 'react-icons/ri'
import { dashboardAPI } from '../services/api'
import AIDashboardBuilder from '../components/Dashboard/AIDashboardBuilder'
import toast from 'react-hot-toast'

// ── Creation mode picker ───────────────────────────────────────────────────────
function CreateModeModal({ onSelectAI, onSelectManual, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">New Dashboard</h3>
            <p className="text-sm text-gray-400 mt-0.5">Choose how you want to create it</p>
          </div>
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <RiCloseLine className="text-xl" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* AI Option */}
          <button
            onClick={onSelectAI}
            className="group relative border-2 border-transparent bg-gradient-to-br from-indigo-50 to-purple-50
              hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400
              rounded-2xl p-5 text-left transition-all cursor-pointer"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl
              flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
              <RiSparklingLine className="text-white text-2xl" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1.5">Generate with AI</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Describe what you need in plain English. AI designs the layout,
              picks the right charts, and writes the queries for you.
            </p>
            <div className="mt-4 space-y-1.5">
              {['Automatic widget layout', 'AI-generated SQL queries', 'Review & refine before deploying'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-indigo-700">
                  <RiCheckLine className="text-indigo-500 flex-shrink-0" /> {f}
                </div>
              ))}
            </div>
            <div className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold
              px-2 py-0.5 rounded-full">
              Recommended
            </div>
          </button>

          {/* Manual Option */}
          <button
            onClick={onSelectManual}
            className="group border-2 border-transparent bg-gray-50 hover:bg-gray-100
              hover:border-gray-300 rounded-2xl p-5 text-left transition-all cursor-pointer"
          >
            <div className="w-12 h-12 bg-gray-200 group-hover:bg-gray-300 rounded-xl
              flex items-center justify-center mb-4 transition-colors">
              <RiEdit2Line className="text-gray-600 text-2xl" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1.5">Build Manually</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Start with a blank dashboard and add widgets one by one.
              Full control over every setting.
            </p>
            <div className="mt-4 space-y-1.5">
              {['Blank canvas', 'Add widgets manually', 'Full customization control'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <RiCheckLine className="text-gray-400 flex-shrink-0" /> {f}
                </div>
              ))}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Manual create modal ────────────────────────────────────────────────────────
function ManualCreateModal({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try { await onCreate(name) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <RiBarChartLine className="text-gray-600 text-lg" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Create Dashboard</h3>
            <p className="text-xs text-gray-400">Blank canvas — add widgets yourself</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dashboard Name</label>
            <input
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Q4 Sales Overview"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                text-white rounded-xl text-sm font-semibold transition-colors">
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  // modal states: null | 'pick' | 'manual' | 'ai'
  const [modal, setModal] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { fetchDashboards() }, [])

  const fetchDashboards = async () => {
    try {
      const { data } = await dashboardAPI.list()
      setDashboards(data)
    } catch {
      toast.error('Failed to load dashboards')
    } finally {
      setLoading(false)
    }
  }

  const createManual = async (name) => {
    try {
      const { data } = await dashboardAPI.create({ name })
      toast.success('Dashboard created!')
      setModal(null)
      navigate(`/dashboards/${data.id}`)
    } catch {
      toast.error('Failed to create dashboard')
    }
  }

  const handleAIDeployed = (dashboard) => {
    // Refresh list and navigate to new dashboard
    fetchDashboards()
    setTimeout(() => {
      setModal(null)
      navigate(`/dashboards/${dashboard.id}`)
    }, 1500)
  }

  const deleteDashboard = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this dashboard?')) return
    try {
      await dashboardAPI.delete(id)
      setDashboards(d => d.filter(x => x.id !== id))
      toast.success('Dashboard deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-500 text-sm mt-1">Build and manage your analytics dashboards</p>
        </div>
        <button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white
            px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
          onClick={() => setModal('pick')}
        >
          <RiAddLine /> New Dashboard
        </button>
      </div>

      {/* Dashboard grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <span className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
          Loading dashboards…
        </div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-20">
          <RiDashboardLine className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold text-lg">No dashboards yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Create your first dashboard to get started</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setModal('ai')}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600
                hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
            >
              <RiSparklingLine /> Generate with AI
            </button>
            <button
              onClick={() => setModal('manual')}
              className="flex items-center gap-2 border border-gray-300 text-gray-600
                hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold text-sm"
            >
              <RiEdit2Line /> Build Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboards.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer
                hover:shadow-md hover:border-indigo-200 transition-all group"
              onClick={() => navigate(`/dashboards/${d.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <RiDashboardLine className="text-indigo-600 text-xl" />
                </div>
                <button
                  onClick={(e) => deleteDashboard(d.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400
                    hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              {d.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{d.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{d.widgets?.length || 0} widgets</span>
                {d.is_public && (
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                    Public
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'pick' && (
        <CreateModeModal
          onSelectAI={() => setModal('ai')}
          onSelectManual={() => setModal('manual')}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'manual' && (
        <ManualCreateModal
          onCreate={createManual}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'ai' && (
        <AIDashboardBuilder
          onClose={() => setModal(null)}
          onDeployed={handleAIDeployed}
        />
      )}
    </div>
  )
}
