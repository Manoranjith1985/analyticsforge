import { useState, useEffect } from 'react'
import {
  RiComputerLine, RiAddLine, RiSearchLine, RiRefreshLine,
  RiDeleteBinLine, RiEdit2Line, RiWifiLine, RiShieldLine,
  RiGlobalLine, RiDownloadLine, RiServerLine,
  RiCloseLine, RiCheckLine,
} from 'react-icons/ri'
import { infraAPI } from '../services/api'
import toast from 'react-hot-toast'

const STATUS_META = {
  online:      { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', icon: RiWifiLine },
  offline:     { color: 'bg-red-100 text-red-600',         dot: 'bg-red-400',     icon: RiShieldLine },
  unknown:     { color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400',    icon: RiShieldLine },
  maintenance: { color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',   icon: RiComputerLine },
}

const TYPE_ICON = {
  workstation: RiComputerLine,
  laptop:      RiComputerLine,
  server:      RiServerLine,
  vm:          RiServerLine,
  network:     RiGlobalLine,
}

function StatCard({ label, value, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:    'bg-red-50 text-red-600 border-red-200',
    gray:   'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-1 ${colors[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
    </div>
  )
}

function AssetModal({ asset, onClose, onSave }) {
  const [form, setForm] = useState(asset || {
    name: '', hostname: '', ip_address: '', asset_type: 'workstation',
    os_name: '', os_version: '', assigned_user: '', department: '', location: '', status: 'online',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{asset ? 'Edit Asset' : 'Add Asset'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RiCloseLine className="text-xl" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            ['name',          'Name *',         'text', 'col-span-2'],
            ['hostname',      'Hostname',        'text', ''],
            ['ip_address',    'IP Address',      'text', ''],
            ['os_name',       'OS',              'text', ''],
            ['os_version',    'OS Version',      'text', ''],
            ['assigned_user', 'Assigned User',   'text', ''],
            ['department',    'Department',      'text', ''],
            ['location',      'Location',        'text', ''],
          ].map(([key, label, type, extra]) => (
            <div key={key} className={extra}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input type={type} value={form[key] || ''}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['workstation','laptop','server','vm','network'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['online','offline','unknown','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            <RiCheckLine />{saving ? 'Saving…' : 'Save Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AssetManagementPage() {
  const [assets, setAssets]   = useState([])
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [modal, setModal]     = useState(null) // null | { mode: 'add'|'edit', asset? }

  useEffect(() => { load() }, [filterStatus, filterType])

  const load = async () => {
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([
        infraAPI.listAssets({ status: filterStatus || undefined, asset_type: filterType || undefined }),
        infraAPI.assetStats(),
      ])
      setAssets(aRes.data)
      setStats(sRes.data)
    } catch { toast.error('Failed to load assets') }
    finally { setLoading(false) }
  }

  const handleSave = async (form) => {
    try {
      if (modal.asset) {
        await infraAPI.updateAsset(modal.asset.id, form)
        toast.success('Asset updated')
      } else {
        await infraAPI.createAsset(form)
        toast.success('Asset added')
      }
      setModal(null)
      load()
    } catch { toast.error('Failed to save asset') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this asset?')) return
    try { await infraAPI.deleteAsset(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const filtered = assets.filter(a =>
    !search || [a.name, a.hostname, a.ip_address, a.assigned_user].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RiComputerLine className="text-indigo-600" /> Asset Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all IT assets across your environment</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal({ mode: 'add' })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
            <RiAddLine /> Add Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={stats.total || 0} color="indigo" />
        <StatCard label="Online"       value={stats.online || 0} color="emerald" />
        <StatCard label="Offline"      value={stats.offline || 0} color="red" />
        <StatCard label="Unknown"      value={stats.unknown || 0} color="gray" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search name, hostname, IP, user…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['online','offline','unknown','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Types</option>
          {['workstation','laptop','server','vm','network'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} assets</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Asset','Type','IP Address','OS','Assigned User','Dept','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <span className="inline-block w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />
                Loading assets…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <RiComputerLine className="text-4xl mx-auto mb-2 text-gray-300" />
                No assets found
              </td></tr>
            ) : filtered.map(asset => {
              const sm = STATUS_META[asset.status] || STATUS_META.unknown
              const TypeIcon = TYPE_ICON[asset.asset_type] || RiComputerLine
              return (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="text-gray-400 text-lg flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{asset.name}</p>
                        <p className="text-xs text-gray-400">{asset.hostname || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{asset.asset_type}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{asset.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{asset.os_name ? `${asset.os_name} ${asset.os_version || ''}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{asset.assigned_user || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{asset.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${sm.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ mode: 'edit', asset })}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <RiEdit2Line />
                      </button>
                      <button onClick={() => handleDelete(asset.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <RiDeleteBinLine />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <AssetModal
          asset={modal.asset}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
