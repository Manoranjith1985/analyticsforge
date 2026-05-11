import { useState, useEffect } from 'react'
import {
  RiGlobalLine, RiAddLine, RiRefreshLine, RiSearchLine,
  RiTerminalLine, RiDeleteBinLine, RiCloseLine,
  RiCheckLine, RiBugLine, RiTimeLine, RiLineChartLine,
  RiPlayLine, RiDownloadLine,
} from 'react-icons/ri'
import { infraAPI } from '../services/api'
import toast from 'react-hot-toast'

const STATUS_META = {
  active:     { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  inactive:   { color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' },
  error:      { color: 'bg-red-100 text-red-600',         dot: 'bg-red-400' },
  installing: { color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400 animate-pulse' },
  updating:   { color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400 animate-pulse' },
}

function StatCard({ label, value, color }) {
  const c = { emerald:'bg-emerald-50 border-emerald-200 text-emerald-700', red:'bg-red-50 border-red-200 text-red-700',
    gray:'bg-gray-50 border-gray-200 text-gray-600', indigo:'bg-indigo-50 border-indigo-200 text-indigo-700' }
  return (
    <div className={`border rounded-xl p-4 ${c[color] || c.gray}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mt-0.5">{label}</div>
    </div>
  )
}

function CommandModal({ probe, onClose }) {
  const [cmdType, setCmdType] = useState('exec_script')
  const [script, setScript]   = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => { loadHistory() }, [])

  const loadHistory = async () => {
    try {
      const { data } = await infraAPI.getProbeCommands(probe.id)
      setHistory(data)
    } catch { /* silent */ }
  }

  const send = async () => {
    if (!script.trim() && cmdType === 'exec_script') { toast.error('Enter a script/command'); return }
    setSending(true)
    try {
      await infraAPI.sendProbeCommand(probe.id, {
        command_type: cmdType,
        payload: cmdType === 'exec_script' ? { script } : { service: script },
      })
      toast.success('Command sent to probe')
      setScript('')
      loadHistory()
    } catch { toast.error('Failed to send command') }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <RiTerminalLine className="text-indigo-600 text-xl" />
            <div>
              <h3 className="font-bold text-gray-900">Remote Command</h3>
              <p className="text-xs text-gray-400">{probe.ip_address || probe.probe_key}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Command Type</label>
            <div className="flex gap-2 flex-wrap">
              {[['exec_script','Run Script'],['restart_service','Restart Service'],['update_probe','Update Probe'],['health_check','Health Check']].map(([v,l]) => (
                <button key={v} onClick={() => setCmdType(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${cmdType === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {cmdType === 'exec_script' ? 'Script / Command' : 'Service Name'}
            </label>
            <textarea rows={4} value={script} onChange={e => setScript(e.target.value)} placeholder={
              cmdType === 'exec_script' ? 'e.g. Get-Process | Where-Object CPU -gt 50' : 'e.g. wuauserv'
            } className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-900 text-green-400 placeholder:text-gray-600" />
          </div>
          <button onClick={send} disabled={sending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            <RiPlayLine />{sending ? 'Sending…' : 'Send Command'}
          </button>

          {/* History */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Commands</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map(cmd => (
                  <div key={cmd.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700">{cmd.command_type}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        cmd.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        cmd.status === 'failed'  ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-500'}`}>{cmd.status}</span>
                    </div>
                    <p className="text-gray-400">{new Date(cmd.issued_at).toLocaleString()}</p>
                    {cmd.result && <pre className="mt-1 text-green-700 font-mono overflow-x-auto">{cmd.result}</pre>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeployProbeModal({ assets, onClose, onDeploy }) {
  const [selectedAsset, setSelectedAsset] = useState('')
  const [deploying, setDeploying] = useState(false)

  const deploy = async () => {
    if (!selectedAsset) { toast.error('Select an asset'); return }
    setDeploying(true)
    try { await onDeploy(selectedAsset) }
    finally { setDeploying(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Deploy New Probe</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Target Asset</label>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select an asset…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.ip_address || a.hostname || 'No IP'}</option>)}
            </select>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            A lightweight probe agent (&lt;50 MB) will be registered for the selected asset. Use the generated probe key to install the agent on the endpoint.
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={deploy} disabled={deploying || !selectedAsset}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            <RiDownloadLine />{deploying ? 'Registering…' : 'Deploy Probe'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProbeManagementPage() {
  const [probes, setProbes]   = useState([])
  const [assets, setAssets]   = useState([])
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [commandTarget, setCommandTarget] = useState(null)
  const [deployModal, setDeployModal]    = useState(false)

  useEffect(() => { load() }, [filterStatus])

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        infraAPI.listProbes({ status: filterStatus || undefined }),
        infraAPI.probeStats(),
        infraAPI.listAssets({}),
      ])
      setProbes(pRes.data); setStats(sRes.data); setAssets(aRes.data)
    } catch { toast.error('Failed to load probes') }
    finally { setLoading(false) }
  }

  const handleDeploy = async (assetId) => {
    try {
      await infraAPI.createProbe({ asset_id: assetId })
      toast.success('Probe registered — install agent on endpoint using the probe key')
      setDeployModal(false)
      load()
    } catch { toast.error('Failed to register probe') }
  }

  const handleStatusChange = async (probe, status) => {
    try {
      await infraAPI.updateProbe(probe.id, { status })
      toast.success(`Probe ${status}`)
      load()
    } catch { toast.error('Failed to update probe') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Uninstall and delete this probe?')) return
    try { await infraAPI.deleteProbe(id); toast.success('Probe removed'); load() }
    catch { toast.error('Failed to remove probe') }
  }

  const filtered = probes.filter(p => !search || p.ip_address?.includes(search) || p.probe_key?.includes(search) || p.os_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RiGlobalLine className="text-indigo-600" /> Probe Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Deploy and monitor lightweight agents across all managed endpoints</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setDeployModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
            <RiAddLine /> Deploy Probe
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total"    value={stats.total    || 0} color="indigo" />
        <StatCard label="Active"   value={stats.active   || 0} color="emerald" />
        <StatCard label="Inactive" value={stats.inactive || 0} color="gray" />
        <StatCard label="Error"    value={stats.error    || 0} color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search IP, probe key, OS…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['active','inactive','error','installing','updating'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} probes</span>
      </div>

      {/* Probe Cards */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <span className="inline-block w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />Loading probes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <RiGlobalLine className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No probes deployed yet</p>
          <p className="text-gray-400 text-sm mt-1">Deploy a probe to start monitoring endpoints</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(probe => {
            const sm = STATUS_META[probe.status] || STATUS_META.inactive
            return (
              <div key={probe.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                {/* Status + actions */}
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sm.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{probe.status}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setCommandTarget(probe)} title="Send Command"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><RiTerminalLine /></button>
                    <button onClick={() => handleStatusChange(probe, probe.status === 'active' ? 'inactive' : 'active')} title="Toggle Status"
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><RiRefreshLine /></button>
                    <button onClick={() => handleDelete(probe.id)} title="Remove Probe"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <RiLineChartLine className="text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-500 truncate">{probe.probe_key}</span>
                  </div>
                  {probe.ip_address && (
                    <p className="text-sm text-gray-700 font-medium">{probe.ip_address}</p>
                  )}
                  {probe.os_name && (
                    <p className="text-xs text-gray-400">{probe.os_name}</p>
                  )}
                </div>

                {/* Capabilities */}
                {probe.capabilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {probe.capabilities.map(cap => (
                      <span key={cap} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{cap}</span>
                    ))}
                  </div>
                )}

                {/* Last heartbeat */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <RiTimeLine />
                  {probe.last_heartbeat
                    ? `Last seen: ${new Date(probe.last_heartbeat).toLocaleString()}`
                    : 'Never connected'}
                </div>

                {probe.version && (
                  <p className="text-xs text-gray-400 mt-1">v{probe.version}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {commandTarget && <CommandModal probe={commandTarget} onClose={() => setCommandTarget(null)} />}
      {deployModal && <DeployProbeModal assets={assets} onClose={() => setDeployModal(false)} onDeploy={handleDeploy} />}
    </div>
  )
}
                           