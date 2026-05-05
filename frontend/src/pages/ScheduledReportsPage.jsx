import { useState, useEffect } from 'react'
import { RiAddLine, RiDeleteBinLine, RiPlayLine, RiTimeLine, RiSettings3Line, RiCheckLine, RiCloseLine } from 'react-icons/ri'
import { scheduledReportsAPI, reportAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const CRON_PRESETS = [
  { label: 'Daily 9am', value: '0 9 * * *' },
  { label: 'Weekly Mon 9am', value: '0 9 * * 1' },
  { label: 'Monthly 1st', value: '0 9 1 * *' },
  { label: 'Hourly', value: '0 * * * *' },
]

export default function ScheduledReportsPage() {
  const [scheduled, setScheduled] = useState([])
  const [reports, setReports] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [executions, setExecutions] = useState({})
  const [form, setForm] = useState({
    name: '', report_id: '', cron_expression: '0 9 * * 1',
    recipients: '', format: 'pdf',
    subject_template: '', message_template: ''
  })
  const [running, setRunning] = useState(null)

  useEffect(() => {
    scheduledReportsAPI.list().then(r => setScheduled(r.data)).catch(() => {})
    reportAPI.list().then(r => setReports(r.data)).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        recipients: form.recipients.split(',').map(s => s.trim()).filter(Boolean),
      }
      const { data } = await scheduledReportsAPI.create(payload)
      setScheduled(s => [data, ...s])
      setShowCreate(false)
      setForm({ name: '', report_id: '', cron_expression: '0 9 * * 1', recipients: '', format: 'pdf', subject_template: '', message_template: '' })
      toast.success('Scheduled report created!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleToggle = async (id) => {
    try {
      const { data } = await scheduledReportsAPI.toggle(id)
      setScheduled(s => s.map(x => x.id === id ? { ...x, is_active: data.is_active } : x))
    } catch { toast.error('Toggle failed') }
  }

  const handleDelete = async (id) => {
    await scheduledReportsAPI.delete(id)
    setScheduled(s => s.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  const handleRunNow = async (sr) => {
    setRunning(sr.id)
    try {
      const { data } = await scheduledReportsAPI.runNow(sr.id)
      toast.success(`Report sent to ${data.sent_to?.length || 0} recipients`)
      setScheduled(s => s.map(x => x.id === sr.id ? { ...x, run_count: x.run_count + 1 } : x))
    } catch (err) { toast.error(err.response?.data?.detail || 'Run failed') }
    finally { setRunning(null) }
  }

  const handleViewExecutions = async (id) => {
    if (executions[id]) { setExecutions(e => ({ ...e, [id]: null })); return }
    try {
      const { data } = await scheduledReportsAPI.getExecutions(id)
      setExecutions(e => ({ ...e, [id]: data }))
    } catch { toast.error('Failed to fetch executions') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Automate report delivery via email on a schedule</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> Schedule Report
        </button>
      </div>

      <div className="space-y-4">
        {scheduled.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <RiTimeLine className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No scheduled reports. Set one up to deliver data automatically.</p>
          </div>
        )}
        {scheduled.map(sr => (
          <div key={sr.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sr.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <h3 className="font-semibold text-gray-800">{sr.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{sr.cron_expression}</span>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{sr.format?.toUpperCase()}</span>
                </div>
                <p className="text-xs text-gray-500">Runs: {sr.run_count} times</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleViewExecutions(sr.id)} className="btn-secondary text-xs px-2 py-1">
                  {executions[sr.id] ? 'Hide' : 'History'}
                </button>
                <button onClick={() => handleRunNow(sr)} disabled={running === sr.id}
                  className="btn-primary text-xs px-2 py-1 flex items-center gap-1">
                  <RiPlayLine /> {running === sr.id ? 'Running…' : 'Run Now'}
                </button>
                <button onClick={() => handleToggle(sr.id)} title={sr.is_active ? 'Deactivate' : 'Activate'}
                  className={`p-1.5 rounded-lg text-sm ${sr.is_active ? 'text-green-500 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}>
                  <RiSettings3Line className="text-lg" />
                </button>
                <button onClick={() => handleDelete(sr.id)} className="text-gray-400 hover:text-red-500 p-1.5">
                  <RiDeleteBinLine />
                </button>
              </div>
            </div>

            {/* Execution history */}
            {executions[sr.id] && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Execution History</p>
                {executions[sr.id].length === 0 && <p className="text-xs text-gray-400">No executions yet</p>}
                <div className="space-y-1">
                  {executions[sr.id].map(ex => (
                    <div key={ex.id} className="flex items-center gap-3 text-xs text-gray-600">
                      {ex.status === 'success'
                        ? <RiCheckLine className="text-green-500 flex-shrink-0" />
                        : <RiCloseLine className="text-red-500 flex-shrink-0" />}
                      <span className={`font-medium ${ex.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{ex.status}</span>
                      <span className="text-gray-400">{ex.executed_at ? format(new Date(ex.executed_at), 'MMM d, HH:mm') : ''}</span>
                      {ex.error && <span className="text-red-400 truncate">{ex.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Schedule a Report</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Report</label>
                <select className="input" value={form.report_id} onChange={e => setForm(f => ({ ...f, report_id: e.target.value }))}>
                  <option value="">— Select Report —</option>
                  {reports.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Schedule</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {CRON_PRESETS.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, cron_expression: p.value }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${form.cron_expression === p.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <input className="input font-mono text-sm" value={form.cron_expression} onChange={e => setForm(f => ({ ...f, cron_expression: e.target.value }))} placeholder="cron expression" />
              </div>
              <div>
                <label className="label">Recipients (comma-separated emails)</label>
                <input className="input" value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} placeholder="user@company.com, boss@company.com" required />
              </div>
              <div>
                <label className="label">Format</label>
                <div className="flex gap-2">
                  {['pdf','excel','csv'].map(fmt => (
                    <button key={fmt} type="button" onClick={() => setForm(f => ({ ...f, format: fmt }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${form.format === fmt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Email Subject (optional)</label>
                <input className="input" value={form.subject_template} onChange={e => setForm(f => ({ ...f, subject_template: e.target.value }))} placeholder="Your weekly report is ready" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
