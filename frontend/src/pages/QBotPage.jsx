import { useState, useEffect } from 'react'
import {
  RiRobot2Line, RiAddLine, RiRefreshLine, RiDeleteBinLine,
  RiPlayLine, RiCheckLine, RiCloseLine, RiFileListLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiTimeLine,
  RiSearch2Line, RiFlashlightLine,
} from 'react-icons/ri'
import { qbotAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── mock data ───────────────────────────────────────────────────────────── */
const MOCK_SUITES = [
  { id: 1, name: 'API Health Checks',      description: 'Core API endpoint smoke tests', cases: 12, last_run: '2 hr ago',  pass_rate: 100, status: 'passed'  },
  { id: 2, name: 'Auth Flow Tests',        description: 'Login, register, token refresh', cases: 8,  last_run: '4 hr ago',  pass_rate: 87,  status: 'failed'  },
  { id: 3, name: 'Dashboard Render Tests', description: 'Widget render and data load',    cases: 20, last_run: '6 hr ago',  pass_rate: 95,  status: 'passed'  },
  { id: 4, name: 'Infra Module Tests',     description: 'Asset, patch, probe validation', cases: 15, last_run: '1 day ago', pass_rate: 100, status: 'passed'  },
  { id: 5, name: 'VESA Scheduler Tests',   description: 'VM schedule trigger validation', cases: 6,  last_run: 'Never',     pass_rate: null, status: 'pending' },
]

const MOCK_RUNS = [
  { id: 1, suite: 'API Health Checks',      started: '10:00 AM', duration: '45s', total: 12, passed: 12, failed: 0,  status: 'passed'  },
  { id: 2, suite: 'Auth Flow Tests',        started: '08:00 AM', duration: '1m 20s', total: 8, passed: 7, failed: 1,  status: 'failed'  },
  { id: 3, suite: 'Dashboard Render Tests', started: 'Yesterday', duration: '2m 10s', total: 20, passed: 19, failed: 1, status: 'failed' },
  { id: 4, suite: 'Infra Module Tests',     started: 'Yesterday', duration: '55s', total: 15, passed: 15, failed: 0,  status: 'passed'  },
]

const MOCK_STATS = { suites: 5, total_cases: 61, pass_rate: 95, runs_today: 8 }

const STATUS_META = {
  passed:  { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  failed:  { color: 'bg-red-100 text-red-600',         dot: 'bg-red-400'     },
  running: { color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400 animate-pulse' },
  pending: { color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-300'    },
}

/* ── sub-components ──────────────────────────────────────────────────────── */
function StatCard({ label, value, color = 'indigo' }) {
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
    </div>
  )
}

function PassBar({ rate }) {
  if (rate === null) return <span className="text-xs text-gray-400">No runs yet</span>
  const color = rate >= 95 ? 'bg-emerald-500' : rate >= 80 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold ${rate >= 95 ? 'text-emerald-600' : rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
    </div>
  )
}

function AddSuiteModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Suite name is required'); return }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">New Test Suite</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Suite Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. API Health Checks"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="What does this suite test?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RiCheckLine />}
            Create Suite
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function QBotPage() {
  const [tab, setTab]         = useState('suites')
  const [suites, setSuites]   = useState([])
  const [runs, setRuns]       = useState([])
  const [stats, setStats]     = useState(MOCK_STATS)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [running, setRunning] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, rRes, stRes] = await Promise.all([
        qbotAPI.listSuites(),
        qbotAPI.listRuns(),
        qbotAPI.suiteStats(),
      ])
      setSuites(sRes.data)
      setRuns(rRes.data)
      setStats(stRes.data)
    } catch {
      setSuites(MOCK_SUITES)
      setRuns(MOCK_RUNS)
      setStats(MOCK_STATS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRunSuite = async (suite) => {
    setRunning(suite.id)
    try {
      await qbotAPI.runSuite(suite.id)
      toast.success(`Running "${suite.name}"…`)
      setTimeout(() => { setRunning(null); load() }, 2000)
    } catch {
      toast.error('Failed to start run')
      setRunning(null)
    }
  }

  const handleDeleteSuite = async (suite) => {
    if (!confirm(`Delete suite "${suite.name}"?`)) return
    try {
      await qbotAPI.deleteSuite(suite.id)
      toast.success('Suite deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleAddSuite = async (data) => {
    try {
      await qbotAPI.createSuite(data)
      toast.success('Suite created')
      setShowAdd(false)
      load()
    } catch {
      toast.error('Failed to create suite')
    }
  }

  const failedSuites = suites.filter(s => s.status === 'failed').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <RiRobot2Line className="text-blue-600 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">QBot</h1>
            <p className="text-sm text-gray-500">AI Quality Assurance Bot</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'suites' && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <RiAddLine /> New Suite
            </button>
          )}
        </div>
      </div>

      {/* Failed banner */}
      {failedSuites > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <RiCloseCircleLine className="text-lg flex-shrink-0" />
          <span><strong>{failedSuites} suite{failedSuites > 1 ? 's' : ''} failing</strong> — review test results below.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Test Suites"  value={stats.suites}      color="indigo" />
        <StatCard label="Total Cases"  value={stats.total_cases} color="indigo" />
        <StatCard label="Pass Rate"    value={`${stats.pass_rate}%`} color={stats.pass_rate >= 95 ? 'emerald' : 'amber'} />
        <StatCard label="Runs Today"   value={stats.runs_today}  color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['suites', 'runs'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'suites' ? 'Test Suites' : 'Run History'}
          </button>
        ))}
      </div>

      {/* Suites Tab */}
      {tab === 'suites' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : suites.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No test suites yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suites.map(suite => {
                const meta = STATUS_META[running === suite.id ? 'running' : suite.status] || STATUS_META.pending
                return (
                  <div key={suite.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{suite.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {running === suite.id ? 'running…' : suite.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{suite.description}</p>
                    </div>

                    {/* Cases */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-sm font-semibold text-gray-700">{suite.cases}</div>
                      <div className="text-xs text-gray-400">cases</div>
                    </div>

                    {/* Pass rate */}
                    <div className="min-w-[120px]">
                      <PassBar rate={suite.pass_rate} />
                    </div>

                    {/* Last run */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 min-w-[90px]">
                      <RiTimeLine className="text-indigo-300" />{suite.last_run}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRunSuite(suite)} disabled={running === suite.id}
                        title="Run suite"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40">
                        {running === suite.id
                          ? <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin block" />
                          : <RiFlashlightLine />
                        }
                      </button>
                      <button onClick={() => handleDeleteSuite(suite)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <RiDeleteBinLine />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Runs Tab */}
      {tab === 'runs' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No runs yet — run a test suite to see results</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    {['Suite', 'Started', 'Duration', 'Passed', 'Failed', 'Result'].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runs.map(run => (
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{run.suite}</td>
                      <td className="px-5 py-3 text-gray-500">{run.started}</td>
                      <td className="px-5 py-3 text-gray-500">{run.duration}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                          <RiCheckboxCircleLine />{run.passed}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className={`flex items-center gap-1.5 font-medium ${run.failed > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          <RiCloseCircleLine />{run.failed}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[run.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                          {run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddSuiteModal onClose={() => setShowAdd(false)} onSave={handleAddSuite} />}
    </div>
  )
}
