import { useState, useEffect } from 'react'
import {
  RiShieldUserLine, RiUserLine, RiDeleteBinLine,
  RiUserAddLine, RiCloseLine, RiEyeLine, RiEyeOffLine, RiCheckLine
} from 'react-icons/ri'
import { adminAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ROLES = ['admin', 'analyst', 'viewer']

const ROLE_BADGE = {
  admin:   'bg-purple-100 text-purple-700',
  analyst: 'bg-blue-100 text-blue-700',
  viewer:  'bg-gray-100 text-gray-600',
}

// ── Add User Modal ─────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'analyst' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim())            e.full_name = 'Name is required'
    if (!form.email.trim())                e.email     = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address'
    if (form.password.length < 6)          e.password  = 'Minimum 6 characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const { data } = await adminAPI.createUser(form)
      toast.success(`User ${data.email} created!`)
      onCreated(data)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create user'
      toast.error(typeof msg === 'string' ? msg.split('|')[0].trim() : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <RiUserAddLine className="text-indigo-600 text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <p className="text-xs text-gray-400">Create an account manually</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <RiCloseLine className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${errors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              placeholder="jane@company.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <RiEyeOffLine /> : <RiEyeLine />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`py-2.5 px-3 rounded-xl border text-sm font-medium capitalize transition-all flex items-center justify-center gap-1.5
                    ${form.role === r
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}>
                  {form.role === r && <RiCheckLine className="text-xs" />}
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 min-h-[16px]">
              {form.role === 'admin'   && 'Full platform access — manage users and all resources.'}
              {form.role === 'analyst' && 'Can create and edit dashboards, reports, and data sources.'}
              {form.role === 'viewer'  && 'Read-only access to shared dashboards and reports.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
                : <><RiUserAddLine /> Create User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)

  const load = async () => {
    try {
      const [u, s] = await Promise.all([adminAPI.listUsers(), adminAPI.getStats()])
      setUsers(u.data)
      setStats(s.data)
    } catch { toast.error('Admin access required') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

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
    } catch { toast.error('Failed to update role') }
  }

  const toggleActive = async (user) => {
    try {
      await adminAPI.updateUser(user.id, { is_active: !user.is_active })
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_active: !x.is_active } : x))
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
    } catch { toast.error('Failed to update user') }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user?')) return
    try {
      await adminAPI.deleteUser(userId)
      setUsers(u => u.filter(x => x.id !== userId))
      toast.success('User deleted')
      if (stats) setStats(s => ({ ...s, total_users: (s.total_users || 1) - 1 }))
    } catch { toast.error('Failed to delete user') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <span className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
      Loading admin panel…
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <RiShieldUserLine className="text-indigo-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm">Manage users, roles, and audit logs</p>
          </div>
        </div>

        {/* Add User Button */}
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <RiUserAddLine className="text-base" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',  value: stats.total_users,       color: 'indigo'  },
            { label: 'Datasources',  value: stats.total_datasources, color: 'cyan'    },
            { label: 'Dashboards',   value: stats.total_dashboards,  color: 'emerald' },
            { label: 'Reports',      value: stats.total_reports,     color: 'amber'   },
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
        {[['users', 'Users'], ['logs', 'Audit Logs']].map(([k, l]) => (
          <button key={k}
            onClick={() => k === 'logs' ? fetchLogs() : setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Users Table */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <RiUserLine className="text-4xl mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users yet.</p>
              <button onClick={() => setShowAddUser(true)}
                className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                Add the first user →
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                          {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs font-semibold border-0 rounded-full px-3 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}
                        value={u.role}
                        onChange={e => updateRole(u.id, e.target.value)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteUser(u.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user">
                        <RiDeleteBinLine />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Time', 'User', 'Action', 'Resource', 'Details'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLogs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No audit logs yet</td></tr>
              )}
              {auditLogs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{log.user || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{log.resource_type}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 max-w-xs truncate">
                    {typeof log.details === 'object' ? log.details?.info || '' : log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={(newUser) => {
            setUsers(u => [...u, newUser])
            if (stats) setStats(s => ({ ...s, total_users: (s.total_users || 0) + 1 }))
          }}
        />
      )}
    </div>
  )
}
