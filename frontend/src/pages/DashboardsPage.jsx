import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiAddLine, RiDashboardLine, RiDeleteBinLine } from 'react-icons/ri'
import { dashboardAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function DashboardsPage() {
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
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

  const createDashboard = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const { data } = await dashboardAPI.create({ name: newName })
      toast.success('Dashboard created!')
      setShowCreate(false)
      setNewName('')
      navigate(`/dashboards/${data.id}`)
    } catch {
      toast.error('Failed to create dashboard')
    }
  }

  const deleteDashboard = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this dashboard?')) return
    await dashboardAPI.delete(id)
    setDashboards(dashboards.filter((d) => d.id !== id))
    toast.success('Dashboard deleted')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-500 text-sm mt-1">Build and manage your analytics dashboards</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> New Dashboard
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-lg mb-4">Create Dashboard</h3>
            <form onSubmit={createDashboard}>
              <input className="input mb-4" placeholder="Dashboard name" autoFocus
                value={newName} onChange={(e) => setNewName(e.target.value)} required />
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-20">
          <RiDashboardLine className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No dashboards yet</p>
          <p className="text-gray-400 text-sm">Create your first dashboard to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboards.map((d) => (
            <div
              key={d.id}
              className="card cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => navigate(`/dashboards/${d.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-3">
                  <RiDashboardLine className="text-primary-600 text-xl" />
                </div>
                <button
                  onClick={(e) => deleteDashboard(d.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              {d.description && <p className="text-gray-500 text-sm mt-1">{d.description}</p>}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-400">{d.widgets?.length || 0} widgets</span>
                {d.is_public && (
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Public</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
