import { useState, useEffect } from 'react'
import { RiAddLine, RiFileChartLine, RiDeleteBinLine, RiDownloadLine } from 'react-icons/ri'
import { reportAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [datasources, setDatasources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', datasource_id: '', query: '', format: 'csv', is_scheduled: false,
  })

  useEffect(() => {
    Promise.all([
      reportAPI.list().then(({ data }) => setReports(data)),
      datasourceAPI.list().then(({ data }) => setDatasources(data)),
    ]).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await reportAPI.create(form)
      setReports([...reports, data])
      setShowCreate(false)
      toast.success('Report created!')
    } catch {
      toast.error('Failed to create report')
    }
  }

  const handleExport = async (report) => {
    try {
      const { data } = await reportAPI.export(report.id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.name}.${report.format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported!')
    } catch {
      toast.error('Export failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    await reportAPI.delete(id)
    setReports(reports.filter((r) => r.id !== id))
    toast.success('Report deleted')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Create and schedule data reports</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> New Report
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="font-semibold text-lg mb-5">Create Report</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Report Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={form.datasource_id} onChange={(e) => setForm({ ...form, datasource_id: e.target.value })}>
                  <option value="">Select...</option>
                  {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Query (SQL)</label>
                <textarea className="input font-mono text-xs h-24 resize-none" value={form.query}
                  onChange={(e) => setForm({ ...form, query: e.target.value })}
                  placeholder="SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days'" />
              </div>
              <div>
                <label className="label">Export Format</label>
                <select className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <RiFileChartLine className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reports yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <RiFileChartLine className="text-purple-600 text-xl" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 uppercase">{r.format}</span>
                    {r.is_scheduled && <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">Scheduled</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleExport(r)} className="btn-secondary text-sm flex items-center gap-1.5">
                  <RiDownloadLine /> Export
                </button>
                <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500">
                  <RiDeleteBinLine />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
