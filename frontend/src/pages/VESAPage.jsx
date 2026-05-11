import { useState, useEffect } from 'react'
import {
  RiVirtualPrivateLine, RiAddLine, RiSearchLine, RiRefreshLine,
  RiPlayLine, RiStopLine, RiRestartLine, RiDeleteBinLine,
  RiCalendarLine, RiTimeLine, RiCloseLine, RiCheckLine,
  RiCameraLine, RiServerLine, RiToggleLine,
} from 'react-icons/ri'
import { vesaAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── helpers ─────────────────────────────────────────────────────────────── */
const STATUS_META = {
  running:  { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  stopped:  { color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400'    },
  paused:   { color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400'   },
  error:    { color: 'bg-red-100 text-red-600',         dot: 'bg-red-400'     },
}

const MOCK_VMS = [
  { id: 1, name: 'prod-web-01',  host: 'esxi-01.local', os: 'Ubuntu 22.04', cpu: 4, ram_gb: 8,  status: 'running', environment: 'Production' },
  { id: 2, name: 'dev-db-01',    host: 'esxi-02.local', os: 'CentOS 8',    cpu: 2, ram_gb: 4,  status: 'stopped', environment: 'Development' },
  { id: 3, name: 'staging-app',  host: 'esxi-01.local', os: 'Windows Server 2019', cpu: 8, ram_gb: 16, status: 'running', environment: 'Staging' },
  { id: 4, name: 'backup-vm',    host: 'esxi-03.local', os: 'Ubuntu 20.04', cpu: 2, ram_gb: 4,  status: 'paused',  environment: 'Backup' },
]

const MOCK_SCHEDULES = [
  { id: 1, vm_name: 'prod-web-01', action: 'snapshot', cron: '0 2 * * *',  next_run: '02:00 tomorrow', active: true  },
  { id: 2, vm_name: 'dev-db-01',   action: 'stop',     cron: '0 20 * * 1-5', next_run: '20:00 today',  active: true  },
  { id: 3, vm_name: 'dev-db-01',   action: 'start',    cron: '0 8 * * 1-5',  next_run: '08:00 Mon',    active: true  },
  { id: 4, vm_name: 'staging-app', action: 'restart',  cron: '0 4 * * 0',    next_run: '04:00 Sunday', active: false },
]

/* ── sub-components ──────────────────────────────────────────────────────── */
function StatCard({ label, value, color = 'indigo' }) {
  const palette = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    gray:    'bg-gray-50 text-gray-600 border-gray-200',
  }
  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-1 ${palette[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
    </div>
  )
}

function AddVMModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', host: '', os: '', cpu: 2, ram_gb: 4, environment: 'Development', status: 'stopped' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('VM name is required'); return }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Register Virtual Machine</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {[
            { label: 'VM Name', key: 'name', span: 2 },
            { label: 'Host / ESXi', key: 'host', span: 2 },
            { label: 'Operating System', key: 'os', span: 2 },
          ].map(({ label, key, span }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => set(key, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">vCPUs</label>
            <input type="number" value={form.cpu} onChange={e => set('cpu', +e.target.value)} min={1} max={64}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">RAM (GB)</label>
            <input type="number" value={form.ram_gb} onChange={e => set('ram_gb', +e.target.value)} min={1} max={512}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Environment</label>
            <select value={form.environment} onChange={e => set('environment', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['Production', 'Staging', 'Development', 'Backup', 'DR'].map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RiCheckLine />}
            Register VM
          </button>
        </div>
      </div>
    </div>
  )
}

function AddScheduleModal({ vms, onClose, onSave }) {
  const [form, setForm] = useState({ vm_id: vms[0]?.id || '', action: 'snapshot', cron: '0 2 * * *' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.vm_id) { toast.error('Select a VM'); return }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Create VM Schedule</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Virtual Machine</label>
            <select value={form.vm_id} onChange={e => set('vm_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {vms.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select value={form.action} onChange={e => set('action', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['start', 'stop', 'restart', 'snapshot', 'pause', 'resume'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cron Expression</label>
            <input value={form.cron} onChange={e => set('cron', e.target.value)}
              placeholder="0 2 * * *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="mt-1 text-xs text-gray-400">min hour day month weekday</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RiCheckLine />}
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function VESAPage() {
  const [tab, setTab]             = useState('vms')
  const [vms, setVMs]             = useState([])
  const [schedules, setSchedules] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showAddVM, setShowAddVM] = useState(false)
  const [showAddSched, setShowAddSched] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [vmRes, schedRes] = await Promise.all([vesaAPI.listVMs(), vesaAPI.listSchedules()])
      setVMs(vmRes.data)
      setSchedules(schedRes.data)
    } catch {
      // fallback to mock data while backend is being built
      setVMs(MOCK_VMS)
      setSchedules(MOCK_SCHEDULES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleVMAction = async (vm, action) => {
    try {
      await vesaAPI.vmAction(vm.id, action)
      toast.success(`${action} sent to ${vm.name}`)
      load()
    } catch {
      toast.error(`Failed to ${action} ${vm.name}`)
    }
  }

  const handleDeleteVM = async (vm) => {
    if (!confirm(`Delete ${vm.name}?`)) return
    try {
      await vesaAPI.deleteVM(vm.id)
      toast.success(`${vm.name} removed`)
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleAddVM = async (data) => {
    try {
      await vesaAPI.createVM(data)
      toast.success('VM registered')
      setShowAddVM(false)
      load()
    } catch {
      toast.error('Failed to register VM')
    }
  }

  const handleAddSchedule = async (data) => {
    try {
      await vesaAPI.createSchedule(data)
      toast.success('Schedule created')
      setShowAddSched(false)
      load()
    } catch {
      toast.error('Failed to create schedule')
    }
  }

  const handleToggleSchedule = async (s) => {
    try {
      await vesaAPI.toggleSchedule(s.id)
      toast.success(`Schedule ${s.active ? 'paused' : 'activated'}`)
      load()
    } catch {
      toast.error('Toggle failed')
    }
  }

  const filteredVMs = vms.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.host?.toLowerCase().includes(search.toLowerCase()) ||
    v.environment?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:   vms.length,
    running: vms.filter(v => v.status === 'running').length,
    stopped: vms.filter(v => v.status === 'stopped').length,
    sched:   schedules.filter(s => s.active).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <RiServerLine className="text-violet-600 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">VESA</h1>
            <p className="text-sm text-gray-500">Virtual Environment Scheduling & Automation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'vms'
            ? <button onClick={() => setShowAddVM(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <RiAddLine /> Register VM
              </button>
            : <button onClick={() => setShowAddSched(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <RiAddLine /> Add Schedule
              </button>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total VMs"       value={stats.total}   color="indigo" />
        <StatCard label="Running"         value={stats.running} color="emerald" />
        <StatCard label="Stopped"         value={stats.stopped} color="gray" />
        <StatCard label="Active Schedules" value={stats.sched}  color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['vms', 'schedules'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'vms' ? 'Virtual Machines' : 'Schedules'}
          </button>
        ))}
      </div>

      {/* VMs Tab */}
      {tab === 'vms' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search VMs…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredVMs.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No virtual machines found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    {['Name', 'Host', 'OS', 'vCPU / RAM', 'Environment', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVMs.map(vm => {
                    const meta = STATUS_META[vm.status] || STATUS_META.stopped
                    return (
                      <tr key={vm.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{vm.name}</td>
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">{vm.host}</td>
                        <td className="px-5 py-3 text-gray-600">{vm.os}</td>
                        <td className="px-5 py-3 text-gray-600">{vm.cpu}v / {vm.ram_gb}GB</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{vm.environment}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {vm.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleVMAction(vm, 'start')} title="Start"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><RiPlayLine /></button>
                            <button onClick={() => handleVMAction(vm, 'stop')} title="Stop"
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><RiStopLine /></button>
                            <button onClick={() => handleVMAction(vm, 'restart')} title="Restart"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><RiRestartLine /></button>
                            <button onClick={() => handleVMAction(vm, 'snapshot')} title="Snapshot"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><RiCameraLine /></button>
                            <button onClick={() => handleDeleteVM(vm)} title="Remove"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No schedules configured</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    {['Virtual Machine', 'Action', 'Cron', 'Next Run', 'Status', 'Toggle'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedules.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{s.vm_name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.action === 'start' ? 'bg-emerald-100 text-emerald-700' :
                          s.action === 'stop'  ? 'bg-red-100 text-red-600' :
                          s.action === 'snapshot' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{s.action}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{s.cron}</td>
                      <td className="px-5 py-3 text-gray-500">
                        <div className="flex items-center gap-1"><RiTimeLine className="text-indigo-400" />{s.next_run}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleToggleSchedule(s)}
                          className={`p-1.5 rounded-lg ${s.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                          <RiToggleLine className="text-xl" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddVM    && <AddVMModal onClose={() => setShowAddVM(false)} onSave={handleAddVM} />}
      {showAddSched && <AddScheduleModal vms={vms} onClose={() => setShowAddSched(false)} onSave={handleAddSchedule} />}
    </div>
  )
}
