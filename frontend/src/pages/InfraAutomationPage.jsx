import { useState, useEffect } from 'react'
import {
  RiRobotLine, RiAddLine, RiRefreshLine, RiPlayLine, RiTimeLine,
  RiDeleteBinLine, RiEdit2Line, RiCloseLine, RiCheckLine,
  RiBugLine, RiShieldLine, RiSettings3Line,
  RiSparklingLine, RiArrowRightLine,
} from 'react-icons/ri'
import { infraAPI } from '../services/api'
import toast from 'react-hot-toast'

const TRIGGER_META = {
  manual:    { color: 'bg-gray-100 text-gray-600',      icon: RiPlayLine, label: 'Manual' },
  scheduled: { color: 'bg-blue-100 text-blue-700',      icon: RiTimeLine,   label: 'Scheduled' },
  event:     { color: 'bg-purple-100 text-purple-700',  icon: RiShieldLine,     label: 'Event' },
  threshold: { color: 'bg-amber-100 text-amber-700',    icon: RiBugLine,      label: 'Threshold' },
}

const RUN_STATUS = {
  running: { color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400 animate-pulse', icon: RiPlayLine },
  success: { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', icon: RiCheckLine },
  failed:  { color: 'bg-red-100 text-red-600',      dot: 'bg-red-400',     icon: RiBugLine },
  partial: { color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400',   icon: RiBugLine },
}

function StatCard({ label, value, color = 'indigo', sub }) {
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
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  )
}

function RuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState(rule || {
    name: '', description: '', trigger_type: 'manual', action_type: 'exec_script',
    target_type: 'asset', is_active: true,
    trigger_config: {}, action_config: { script: '' },
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setActionScript = (v) => setForm(f => ({ ...f, action_config: { ...f.action_config, script: v } }))
  const setCron = (v) => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, cron: v } }))
  const setThreshold = (k, v) => setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, [k]: v } }))

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true); try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">{rule ? 'Edit Automation Rule' : 'New Automation Rule'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rule Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Auto-restart crashed services"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trigger</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {Object.entries(TRIGGER_META).map(([k, m]) => (
                <button key={k} onClick={() => set('trigger_type', k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.trigger_type === k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <m.icon />{m.label}
                </button>
              ))}
            </div>
            {form.trigger_type === 'scheduled' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cron Expression</label>
                <input value={form.trigger_config.cron || ''} onChange={e => setCron(e.target.value)}
                  placeholder="e.g. 0 2 * * * (daily at 2am)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            {form.trigger_type === 'threshold' && (
              <div className="grid grid-cols-3 gap-2">
                {[['metric','Metric'],['operator','Operator'],['value','Value']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                    <input value={form.trigger_config[k] || ''} onChange={e => setThreshold(k, e.target.value)}
                      placeholder={k === 'metric' ? 'cpu_pct' : k === 'operator' ? '>' : '85'}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
                <select value={form.action_type} onChange={e => set('action_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {[['exec_script','Run Script'],['restart_service','Restart Service'],['patch','Deploy Patch'],['notify','Send Notification'],['reboot','Reboot Server']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Target</label>
                <select value={form.target_type} onChange={e => set('target_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['asset','server','probe','all'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {(form.action_type === 'exec_script' || form.action_type === 'restart_service') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {form.action_type === 'exec_script' ? 'Script Content' : 'Service Name'}
                </label>
                <textarea rows={4} value={form.action_config.script || ''} onChange={e => setActionScript(e.target.value)}
                  placeholder={form.action_type === 'exec_script'
                    ? '# PowerShell or bash script\nGet-Service | Where-Object Status -eq "Stopped" | Start-Service'
                    : 'e.g. wuauserv'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-900 text-green-400 placeholder:text-gray-600" />
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">Active — rule will run when triggered</span>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50">
            <RiPlayLine />{saving ? 'Saving…' : rule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InfraAutomationPage() {
  const [rules, setRules]   = useState([])
  const [runs, setRuns]     = useState([])
  const [stats, setStats]   = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('rules')
  const [modal, setModal]   = useState(null)
  const [running, setRunning] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, runRes, stRes] = await Promise.all([
        infraAPI.listRules(),
        infraAPI.listRuns({}),
        infraAPI.automationStats(),
      ])
      setRules(rRes.data); setRuns(runRes.data); setStats(stRes.data)
    } catch { toast.error('Failed to load automation') }
    finally { setLoading(false) }
  }

  const handleSave = async (form) => {
    try {
      if (modal.rule) { await infraAPI.updateRule(modal.rule.id, form); toast.success('Rule updated') }
      else { await infraAPI.createRule(form); toast.success('Rule created') }
      setModal(null); load()
    } catch { toast.error('Failed to save rule') }
  }

  const handleRun = async (rule) => {
    setRunning(rule.id)
    try {
      await infraAPI.runRule(rule.id)
      toast.success(`"${rule.name}" triggered`)
      load()
    } catch { toast.error('Failed to trigger rule') }
    finally { setRunning(null) }
  }

  const handleToggle = async (rule) => {
    try { await infraAPI.updateRule(rule.id, { is_active: !rule.is_active }); load() }
    catch { toast.error('Failed to toggle') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation rule?')) return
    try { await infraAPI.deleteRule(id); toast.success('Rule deleted'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RiRobotLine className="text-indigo-600" /> Infra Automation
          </h1>
          <p className="text-sm text-gray-500 mt-1">Self-healing rules, runbooks, and automated remediation workflows</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal({ mode: 'add' })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
            <RiAddLine /> New Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Rules"  value={stats.total_rules  || 0} color="indigo" />
        <StatCard label="Active Rules" value={stats.active_rules || 0} color="emerald" />
        <StatCard label="Total Runs"   value={stats.total_runs   || 0} color="gray" />
        <StatCard label="Successful"   value={stats.success_runs || 0} color="emerald" />
        <StatCard label="Failed"       value={stats.failed_runs  || 0} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['rules','Automation Rules',RiCheckLine],['history','Execution History',RiTimeLine]].map(([k,l,Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon />{l}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <span className="inline-block w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-2" />Loading rules…
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <RiRobotLine className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No automation rules yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Create your first rule to start automating IT remediation</p>
            <button onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-2 mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
              <RiSparklingLine /> Create First Rule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map(rule => {
              const tm = TRIGGER_META[rule.trigger_type] || TRIGGER_META.manual
              const TIcon = tm.icon
              return (
                <div key={rule.id} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${!rule.is_active ? 'opacity-60' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${tm.color}`}>
                          <TIcon className="text-xs" />{tm.label}
                        </span>
                        {!rule.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Paused</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{rule.name}</h3>
                      {rule.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{rule.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleToggle(rule)} title={rule.is_active ? 'Pause' : 'Activate'}
                        className={`p-1.5 rounded-lg text-gray-400 ${rule.is_active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}>
                        {rule.is_active ? <RiTimeLine /> : <RiPlayLine />}
                      </button>
                      <button onClick={() => setModal({ mode: 'edit', rule })}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><RiEdit2Line /></button>
                      <button onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RiDeleteBinLine /></button>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">Action: {rule.action_type}</span>
                    <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">Target: {rule.target_type}</span>
                    {rule.run_count > 0 && <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">Ran {rule.run_count}×</span>}
                  </div>

                  {/* Last run */}
                  {rule.last_run_at && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <RiTimeLine />
                      Last: {new Date(rule.last_run_at).toLocaleString()}
                      {rule.last_run_status && (
                        <span className={`ml-1 px-2 py-0.5 rounded-full font-medium ${
                          rule.last_run_status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          rule.last_run_status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                        }`}>{rule.last_run_status}</span>
                      )}
                    </div>
                  )}

                  {/* Run button */}
                  <button
                    onClick={() => handleRun(rule)}
                    disabled={running === rule.id}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {running === rule.id
                      ? <><span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> Running…</>
                      : <><RiArrowRightLine /> Run Now</>
                    }
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Rule','Triggered By','Status','Targets','Started','Duration'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No runs yet</td></tr>
              ) : runs.map(run => {
                const rs = RUN_STATUS[run.status] || RUN_STATUS.running
                const RIcon = rs.icon
                const duration = run.finished_at
                  ? `${Math.round((new Date(run.finished_at) - new Date(run.started_at)) / 1000)}s`
                  : '—'
                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 text-xs font-mono">{run.rule_id?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-600">{run.triggered_by || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rs.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />{run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {run.targets_hit ? `${run.targets_ok}/${run.targets_hit} ok` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(run.started_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{duration}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <RuleModal
          rule={modal.rule}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
                                                                                     