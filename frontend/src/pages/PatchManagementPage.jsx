import { useState, useEffect } from 'react'
import {
  RiShieldLine, RiAddLine, RiRefreshLine, RiSearchLine,
  RiBugLine, RiCheckLine, RiTimeLine, RiCloseLine,
  RiArrowRightLine, RiComputerLine,
} from 'react-icons/ri'
import { infraAPI } from '../services/api'
import toast from 'react-hot-toast'

const SEVERITY = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200',     dot: 'bg-red-500',    label: 'Critical' },
  high:     { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'High' },
  medium:   { color: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500',  label: 'Medium' },
  low:      { color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-400',   label: 'Low' },
}

const DEP_STATUS = {
  pending:    { color: 'bg-gray-100 text-gray-600',    icon: RiTimeLine },
  scheduled:  { color: 'bg-blue-100 text-blue-700',    icon: RiTimeLine },
  installing: { color: 'bg-amber-100 text-amber-700',  icon: RiRefreshLine },
  installed:  { color: 'bg-emerald-100 text-emerald-700', icon: RiCheckLine },
  failed:     { color: 'bg-red-100 text-red-700',      icon: RiBugLine },
  ignored:    { color: 'bg-gray-100 text-gray-400',    icon: RiCloseLine },
}

function StatCard({ label, value, color }) {
  const colors = { red:'bg-red-50 border-red-200 text-red-700', orange:'bg-orange-50 border-orange-200 text-orange-700',
    emerald:'bg-emerald-50 border-emerald-200 text-emerald-700', gray:'bg-gray-50 border-gray-200 text-gray-600',
    amber:'bg-amber-50 border-amber-200 text-amber-700', blue:'bg-blue-50 border-blue-200 text-blue-700' }
  return (
    <div className={`border rounded-xl p-4 ${colors[color] || colors.gray}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mt-0.5">{label}</div>
    </div>
  )
}

function DeployModal({ patch, assets, onClose, onDeploy }) {
  const [selectedAssets, setSelectedAssets] = useState([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [deploying, setDeploying] = useState(false)

  const toggle = (id) => setSelectedAssets(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const handleDeploy = async () => {
    if (!selectedAssets.length) { toast.error('Select at least one asset'); return }
    setDeploying(true)
    try { await onDeploy(patch.id, selectedAssets, scheduledAt) }
    finally { setDeploying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Deploy Patch</h3>
            <p className="text-xs text-gray-400 mt-0.5">{patch.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RiCloseLine />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Select Target Assets</label>
            <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
              {assets.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">No assets available</div>
              ) : assets.map(a => (
                <label key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedAssets.includes(a.id)} onChange={() => toggle(a.id)}
                    className="rounded text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.os_name} · {a.ip_address || 'No IP'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.status}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedAssets.length} selected</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Schedule (optional — leave blank to deploy now)</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleDeploy} disabled={deploying || !selectedAssets.length}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            <RiArrowRightLine />{deploying ? 'Deploying…' : `Deploy to ${selectedAssets.length} asset${selectedAssets.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddPatchModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', kb_id:'', severity:'medium', category:'security', description:'' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Add Patch</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="p-6 space-y-4">
          {[['name','Name *'],['kb_id','KB / CVE ID'],['description','Description']].map(([k,l]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
              {k === 'description'
                ? <textarea rows={2} value={form[k]} onChange={e => set(k, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                : <input value={form[k]} onChange={e => set(k, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              }
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['security','feature','driver','definition'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Patch'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PatchManagementPage() {
  const [patches, setPatches]   = useState([])
  const [assets, setAssets]     = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [deployTarget, setDeployTarget] = useState(null)
  const [addModal, setAddModal] = useState(false)

  useEffect(() => { load() }, [filterSev])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        infraAPI.listPatches({ severity: filterSev || undefined }),
        infraAPI.patchStats(),
        infraAPI.listAssets({}),
      ])
      setPatches(pRes.data); setStats(sRes.data); setAssets(aRes.data)
    } catch { toast.error('Failed to load patches') }
    finally { setLoading(false) }
  }

  const handleDeploy = async (patchId, assetIds, scheduledAt) => {
    try {
      await infraAPI.deployPatch(patchId, { asset_ids: assetIds, scheduled_at: scheduledAt || undefined })
      toast.success('Patch deployment queued')
      setDeployTarget(null)
    } catch { toast.error('Deploy failed') }
  }

  const handleAddPatch = async (form) => {
    try { await infraAPI.createPatch(form); toast.success('Patch added'); setAddModal(false); load() }
    catch { toast.error('Failed to add patch') }
  }

  const filtered = patches.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.kb_id?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RiShieldLine className="text-indigo-600" /> Patch Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track and deploy patches across all managed endpoints</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
            <RiAddLine /> Add Patch
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total"    value={stats.total || 0}    color="gray" />
        <StatCard label="Critical" value={stats.critical || 0} color="red" />
        <StatCard label="High"     value={stats.high || 0}     color="orange" />
        <StatCard label="Installed" value={stats.installed || 0} color="emerald" />
        <StatCard label="Pending"  value={stats.pending || 0}  color="amber" />
        <StatCard label="Failed"   value={stats.failed || 0}   color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search patches…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Severities</option>
          {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} patches</span>
      </div>

      {/* Patch Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Patch Name','KB / CVE','Severity','Category','Description','Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <span className="inline-block w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />Loading…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                <RiShieldLine className="text-4xl mx-auto mb-2 text-gray-300" />No patches found
              </td></tr>
            ) : filtered.map(patch => {
              const sev = SEVERITY[patch.severity] || SEVERITY.medium
              return (
                <tr key={patch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{patch.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{patch.kb_id || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sev.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />{sev.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{patch.category}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{patch.description || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeployTarget(patch)}
                      className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium">
                      <RiComputerLine /> Deploy
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {deployTarget && <DeployModal patch={deployTarget} assets={assets} onClose={() => setDeployTarget(null)} onDeploy={handleDeploy} />}
      {addModal && <AddPatchModal onClose={() => setAddModal(false)} onSave={handleAddPatch} />}
    </div>
  )
}
