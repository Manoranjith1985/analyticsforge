import { useState, useEffect } from 'react'
import {
  RiShieldCheckLine, RiAddLine, RiRefreshLine, RiDeleteBinLine,
  RiEdit2Line, RiAlertLine, RiCheckboxCircleLine, RiToggleLine,
  RiCloseLine, RiCheckLine, RiBrainLine, RiPulseLine,
} from 'react-icons/ri'
import { virtualSupervisorAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── mock data ───────────────────────────────────────────────────────────── */
const MOCK_RULES = [
  { id: 1, name: 'High CPU Alert',       condition: 'cpu_usage > 90%',  action: 'restart_service', target: 'web-servers',   active: true,  triggered: 12 },
  { id: 2, name: 'Disk Space Warning',   condition: 'disk_free < 10%',  action: 'cleanup_logs',    target: 'all-hosts',     active: true,  triggered: 5  },
  { id: 3, name: 'Memory Pressure',      condition: 'ram_used > 95%',   action: 'notify_team',     target: 'db-servers',    active: true,  triggered: 3  },
  { id: 4, name: 'Service Down',         condition: 'ping_fail = true', action: 'restart_vm',      target: 'critical-vms',  active: false, triggered: 0  },
  { id: 5, name: 'Failed Login Spike',   condition: 'auth_fail > 20',   action: 'block_ip + alert',target: 'auth-servers',  active: true,  triggered: 7  },
]

const MOCK_ALERTS = [
  { id: 1, rule: 'High CPU Alert',    host: 'prod-web-01', severity: 'critical', status: 'open',         timestamp: '10 min ago', remediated: false },
  { id: 2, rule: 'Disk Space Warning',host: 'prod-db-01',  severity: 'warning',  status: 'acknowledged', timestamp: '1 hr ago',   remediated: true  },
  { id: 3, rule: 'Memory Pressure',   host: 'staging-app', severity: 'warning',  status: 'open',         timestamp: '2 hr ago',   remediated: false },
  { id: 4, rule: 'Failed Login Spike',host: 'auth-01',     severity: 'critical', status: 'resolved',     timestamp: '4 hr ago',   remediated: true  },
  { id: 5, rule: 'High CPU Alert',    host: 'prod-web-02', severity: 'critical', status: 'open',         timestamp: '15 min ago', remediated: false },
]

const MOCK_STATS = { rules: 4, alerts_today: 8, auto_remediated: 5, uptime_pct: 99.7 }

const SEV_META = {
  critical: 'bg-red-100 text-red-600 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
}

const STATUS_META = {
  open:         'bg-red-50 text-red-600',
  acknowledged: 'bg-amber-50 text-amber-700',
  resolved:     'bg-emerald-50 text-emerald-700',
}

/* ── sub-components ──────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color = 'indigo' }) {
  const palette = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:     'bg-red-50 text-red-600 border-red-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-1 ${palette[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </div>
  )
}

function RuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState(rule || { name: '', condition: '', action: '', target: '', active: true })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.condition.trim()) { toast.error('Name and condition are required'); return }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{rule ? 'Edit Supervisor Rule' : 'New Supervisor Rule'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {[
            { label: 'Rule Name',  key: 'name',      ph: 'e.g. High CPU Alert' },
            { label: 'Condition',  key: 'condition',  ph: 'e.g. cpu_usage > 90%' },
            { label: 'Action',     key: 'action',     ph: 'e.g. restart_service, notify_team' },
            { label: 'Target',     key: 'target',     ph: 'e.g. web-servers, all-hosts' },
          ].map(({ label, key, ph }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm text-gray-700">Enable rule immediately</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RiCheckLine />}
            {rule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function VirtualSupervisorPage() {
  const [tab, setTab]           = useState('rules')
  const [rules, setRules]       = useState([])
  const [alerts, setAlerts]     = useState([])
  const [stats, setStats]       = useState(MOCK_STATS)
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'add' | rule-object

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, aRes, sRes] = await Promise.all([
        virtualSupervisorAPI.listRules(),
        virtualSupervisorAPI.listAlerts(),
        virtualSupervisorAPI.ruleStats(),
      ])
      setRules(rRes.data)
      setAlerts(aRes.data)
      setStats(sRes.data)
    } catch {
      setRules(MOCK_RULES)
      setAlerts(MOCK_ALERTS)
      setStats(MOCK_STATS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSaveRule = async (data) => {
    try {
      if (data.id) {
        await virtualSupervisorAPI.updateRule(data.id, data)
        toast.success('Rule updated')
      } else {
        await virtualSupervisorAPI.createRule(data)
        toast.success('Rule created')
      }
      setModal(null)
      load()
    } catch {
      toast.error('Failed to save rule')
    }
  }

  const handleDeleteRule = async (rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return
    try {
      await virtualSupervisorAPI.deleteRule(rule.id)
      toast.success('Rule deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleToggleRule = async (rule) => {
    try {
      await virtualSupervisorAPI.toggleRule(rule.id)
      toast.success(`Rule ${rule.active ? 'paused' : 'activated'}`)
      load()
    } catch {
      toast.error('Toggle failed')
    }
  }

  const handleAcknowledge = async (alert) => {
    try {
      await virtualSupervisorAPI.acknowledgeAlert(alert.id)
      toast.success('Alert acknowledged')
      load()
    } catch {
      toast.error('Failed to acknowledge')
    }
  }

  const openAlerts  = alerts.filter(a => a.status === 'open').length
  const critAlerts  = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <RiBrainLine className="text-emerald-600 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Virtual Supervisor</h1>
            <p className="text-sm text-gray-500">AI-powered auto-remediation & monitoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'rules' && (
            <button onClick={() => setModal('add')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <RiAddLine /> New Rule
            </button>
          )}
        </div>
      </div>

      {/* Critical alert banner */}
      {critAlerts > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <RiAlertLine className="text-lg flex-shrink-0" />
          <span><strong>{critAlerts} critical alert{critAlerts > 1 ? 's' : ''}</strong> require immediate attention.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Rules"      value={stats.rules}           color="indigo" />
        <StatCard label="Alerts Today"      value={stats.alerts_today}    color="amber" />
        <StatCard label="Auto-Remediated"   value={stats.auto_remediated} color="emerald" />
        <StatCard label="System Uptime"     value={`${stats.uptime_pct}%`} color="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['rules', 'alerts'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'rules' ? 'Supervisor Rules' : `Live Alerts ${openAlerts > 0 ? `(${openAlerts})` : ''}`}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No supervisor rules configured</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    {['Rule Name', 'Condition', 'Action', 'Target', 'Triggered', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{rule.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600 bg-gray-50 rounded">{rule.condition}</td>
                      <td className="px-5 py-3 text-indigo-600 text-xs font-medium">{rule.action}</td>
                      <td className="px-5 py-3 text-gray-500">{rule.target}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <RiPulseLine className="text-indigo-400" />{rule.triggered}×
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {rule.active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal(rule)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><RiEdit2Line /></button>
                          <button onClick={() => handleToggleRule(rule)} className={`p-1.5 rounded-lg ${rule.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}><RiToggleLine className="text-lg" /></button>
                          <button onClick={() => handleDeleteRule(rule)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <RiShieldCheckLine className="text-4xl text-emerald-400" />
              <span>No alerts — all systems healthy</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    {['Rule', 'Host', 'Severity', 'Status', 'Remediated', 'Time', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{alert.rule}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{alert.host}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEV_META[alert.severity]}`}>{alert.severity}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[alert.status]}`}>{alert.status}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {alert.remediated
                          ? <RiCheckboxCircleLine className="text-emerald-500 text-lg mx-auto" />
                          : <span className="text-gray-300 text-lg mx-auto block text-center">—</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-gray-500">{alert.timestamp}</td>
                      <td className="px-5 py-3">
                        {alert.status === 'open' && (
                          <button onClick={() => handleAcknowledge(alert)}
                            className="px-3 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100">
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <RuleModal
          rule={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaveRule}
        />
      )}
    </div>
  )
}
