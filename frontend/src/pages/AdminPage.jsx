import { useState, useEffect } from 'react'
import { RiShieldLine, RiUserLine, RiDeleteBinLine, RiRefreshLine, RiBarChartLine } from 'react-icons/ri'
import { adminAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ROLES = ['admin','analyst','viewer']

export default function AdminPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s] = await Promise.all([adminAPI.listUsers(), adminAPI.getStats()])
        setUsers(u.data); setStats(s.data)
      } catch { toast.error('Admin access required') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const fetchLogs = async () => {
    try {
      const { data } = await adminAPI.getAuditLogs({})
      setAuditLogs(data)
      setTab('logs')
    } catch { toast.error('Failed to fetch logs') }
  }

  const updateRole = async (userId, role) => {
    try {
      await adminAPI.updateUser(userId, { role })
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
      toast.success('Role updated')
    } catch { toast.error('Error') }
  }

  const toggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user.id, { is_active: !user.is_active })
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: !x.is_active } : x))
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
    } catch { toast.error('Error') }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return
    try {
      await adminAPI.deleteUser(userId)
      setUsers(u => u.filter(x => x.id !== userId))
      toast.success('User deleted')
    } catch { toast.error('Error') }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading admin panel…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RiShieldLine className="text-2xl text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage users, roles, and audit logs</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.total_users, color: 'indigo' },
            { label: 'Datasources', value: stats.total_datasources, color: 'cyan' },
            { label: 'Dashboards', value: stats.total_dashboards, color: 'emerald' },
            { label: 'Reports', value: stats.total_reports, color: 'amber' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 text-${s.color}-600`}>{s.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['users','Users'],['logs','Audit Logs']].map(([k,l]) => (
          <button key={k} onClick={() => k === 'logs' ? fetchLogs() : setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['User','Email','Role','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                        {u.full_name?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{u.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                      value={u.role} onChange={e => updateRole(u.id, e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <RiDeleteBinLine />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Time','User','Action','Resource','IP'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLogs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No audit logs found</td></tr>
              )}
              {auditLogs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500">{log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : ''}</td>
                  <td className="px-4 py-2 text-xs text-gray-700">{log.user_email || log.user_id || '—'}</td>
                  <td className="px-4 py-2"><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{log.action}</span></td>
                  <td className="px-4 py-2 text-xs text-gray-600">{log.resource_type} {log.resource_id ? `#${log.resource_id}` : ''}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
