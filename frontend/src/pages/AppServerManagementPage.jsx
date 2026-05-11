import { useState, useEffect } from 'react'
import {
  RiServerLine, RiAddLine, RiRefreshLine, RiSearchLine,
  RiPlayLine, RiDeleteBinLine, RiEdit2Line,
  RiCloseLine, RiCpuLine, RiBarChartLine, RiTimeLine,
  RiCheckLine, RiBugLine,
} from 'react-icons/ri'
import { infraAPI } from '../services/api'
import toast from 'react-hot-toast'

// ── Shared helpers ────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'indigo' }) {
  const c = {
    indigo:'bg-indigo-50 border-indigo-200 text-indigo-700',
    emerald:'bg-emerald-50 border-emerald-200 text-emerald-700',
    red:'bg-red-50 border-red-200 text-red-700',
    gray:'bg-gray-50 border-gray-200 text-gray-600',
    amber:'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`border rounded-xl p-4 ${c[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mt-0.5">{label}</div>
    </div>
  )
}

function ProgressBar({ value, color = 'indigo' }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  const colors = { indigo:'bg-indigo-500', emerald:'bg-emerald-500', amber:'bg-amber-400', red:'bg-red-500' }
  const barColor = pct > 85 ? 'red' : pct > 65 ? 'amber' : color
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${colors[barColor]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

// ── Applications Tab ──────────────────────────────────────────────────────────
const APP_STATUS_COLOR = { active:'bg-emerald-100 text-emerald-700', deprecated:'bg-gray-100 text-gray-500', pending:'bg-amber-100 text-amber-700' }

function AddAppModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', version:'', vendor:'', category:'business', description:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true); try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add Application</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="p-6 space-y-3">
          {[['name','Name *'],['version','Version'],['vendor','Vendor'],['description','Description']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['business','security','dev','infra','utility'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Add App'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplicationsTab() {
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [addModal, setAddModal] = useState(false)

  useEffect(() => { load() }, [])
  const load = async () => {
    setLoading(true)
    try { const { data } = await infraAPI.listApplications({}); setApps(data) }
    catch { toast.error('Failed to load applications') }
    finally { setLoading(false) }
  }
  const handleSave = async (form) => {
    try { await infraAPI.createApplication(form); toast.success('Application added'); setAddModal(false); load() }
    catch { toast.error('Failed to add') }
  }
  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return
    try { await infraAPI.deleteApplication(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }
  const handleStatusToggle = async (app) => {
    const next = app.status === 'active' ? 'deprecated' : 'active'
    try { await infraAPI.updateApplication(app.id, { status: next }); load() }
    catch { toast.error('Failed to update') }
  }
  const filtered = apps.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.vendor?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search applications…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          <RiAddLine /> Add App
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Application','Version','Vendor','Category','Assets','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                <span className="inline-block w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />Loading…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No applications found</td></tr>
            ) : filtered.map(app => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <RiServerLine className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{app.name}</p>
                      {app.description && <p className="text-xs text-gray-400 truncate max-w-48">{app.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{app.version || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{app.vendor || '—'}</td>
                <td className="px-4 py-3 capitalize text-gray-500 text-xs">{app.category}</td>
                <td className="px-4 py-3 text-gray-600">{app.asset_count || 0}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLOR[app.status] || 'bg-gray-100 text-gray-500'}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleStatusToggle(app)} title="Toggle Status"
                      className={`p-1.5 rounded-lg text-gray-400 ${app.status === 'active' ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}>
                      {app.status === 'active' ? <RiCloseLine /> : <RiPlayLine />}
                    </button>
                    <button onClick={() => handleDelete(app.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addModal && <AddAppModal onClose={() => setAddModal(false)} onSave={handleSave} />}
    </div>
  )
}

// ── Servers Tab ───────────────────────────────────────────────────────────────
const SRV_STATUS = {
  running:     { color:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-400' },
  stopped:     { color:'bg-gray-100 text-gray-500',       dot:'bg-gray-400' },
  rebooting:   { color:'bg-blue-100 text-blue-700',       dot:'bg-blue-400 animate-pulse' },
  maintenance: { color:'bg-amber-100 text-amber-700',     dot:'bg-amber-400' },
  error:       { color:'bg-red-100 text-red-600',         dot:'bg-red-400' },
}

function AddServerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', hostname:'', ip_address:'', server_type:'physical', os_name:'', environment:'production', role:'', provider:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true); try { await onSave(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add Server</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3">
          {[['name','Name *','col-span-2'],['hostname','Hostname',''],['ip_address','IP Address',''],['os_name','OS',''],['role','Role',''],['provider','Provider','']].map(([k,l,extra]) => (
            <div key={k} className={extra}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          {[['server_type','Type',['physical','vm','cloud','container']],['environment','Environment',['production','staging','dev','dr']]].map(([k,l,opts]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
              <select value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Server'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServersTab() {
  const [servers, setServers] = useState([])
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterEnv, setFilterEnv] = useState('')
  const [addModal, setAddModal]   = useState(false)

  useEffect(() => { load() }, [filterEnv])
  const load = async () => {
    setLoading(true)
    try {
      const [sRes, stRes] = await Promise.all([
        infraAPI.listServers({ environment: filterEnv || undefined }),
        infraAPI.serverStats(),
      ])
      setServers(sRes.data); setStats(stRes.data)
    } catch { toast.error('Failed to load servers') }
    finally { setLoading(false) }
  }
  const handleSave = async (form) => {
    try { await infraAPI.createServer(form); toast.success('Server added'); setAddModal(false); load() }
    catch { toast.error('Failed') }
  }
  const handleAction = async (server, action) => {
    const statusMap = { start: 'running', stop: 'stopped', reboot: 'rebooting' }
    try { await infraAPI.updateServer(server.id, { status: statusMap[action] }); toast.success(`Server ${action}ed`); load() }
    catch { toast.error('Action failed') }
  }
  const handleDelete = async (id) => {
    if (!confirm('Remove this server?')) return
    try { await infraAPI.deleteServer(id); toast.success('Removed'); load() }
    catch { toast.error('Failed') }
  }
  const filtered = servers.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.ip_address?.includes(search) || s.role?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total"   value={stats.total   || 0} color="indigo" />
        <StatCard label="Running" value={stats.running || 0} color="emerald" />
        <StatCard label="Stopped" value={stats.stopped || 0} color="gray" />
        <StatCard label="Error"   value={stats.error   || 0} color="red" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search servers…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Environments</option>
          {['production','staging','dev','dr'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button onClick={() => setAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          <RiAddLine /> Add Server
        </button>
      </div>

      {/* Server Grid */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">
          <span className="inline-block w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(srv => {
            const sm = SRV_STATUS[srv.status] || SRV_STATUS.stopped
            return (
              <div key={srv.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <RiServerLine className="text-indigo-600 text-xl" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{srv.name}</p>
                      <p className="text-xs text-gray-400">{srv.ip_address || srv.hostname || '—'} · {srv.environment}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sm.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{srv.status}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-2 mb-4">
                  {srv.cpu_pct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><RiCpuLine />CPU</span>
                      </div>
                      <ProgressBar value={srv.cpu_pct} />
                    </div>
                  )}
                  {srv.ram_pct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><RiBarChartLine />RAM</span>
                      </div>
                      <ProgressBar value={srv.ram_pct} />
                    </div>
                  )}
                  {srv.disk_pct != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><RiServerLine />Disk</span>
                      </div>
                      <ProgressBar value={srv.disk_pct} />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <RiTimeLine />{srv.uptime_hours ? `${Math.round(srv.uptime_hours)}h uptime` : srv.os_name || '—'}
                  </div>
                  <div className="flex gap-1">
                    {srv.status !== 'running' && (
                      <button onClick={() => handleAction(srv, 'start')}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><RiPlayLine /></button>
                    )}
                    {srv.status === 'running' && (
                      <button onClick={() => handleAction(srv, 'stop')}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><RiCloseLine /></button>
                    )}
                    <button onClick={() => handleAction(srv, 'reboot')}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><RiRefreshLine /></button>
                    <button onClick={() => handleDelete(srv.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && !loading && (
            <div className="col-span-2 text-center py-10 text-gray-400">
              <RiServerLine className="text-4xl mx-auto mb-2 text-gray-300" />No servers found
            </div>
          )}
        </div>
      )}
      {addModal && <AddServerModal onClose={() => setAddModal(false)} onSave={handleSave} />}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AppServerManagementPage() {
  const [tab, setTab] = useState('applications')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RiServerLine className="text-indigo-600" /> App & Server Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Monitor applications and server infrastructure across your environment</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['applications','Applications',RiServerLine],['servers','Servers',RiServerLine]].map(([key,label,Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon />{label}
          </button>
        ))}
      </div>

      {tab === 'applications' ? <ApplicationsTab /> : <ServersTab />}
    </div>
  )
}
