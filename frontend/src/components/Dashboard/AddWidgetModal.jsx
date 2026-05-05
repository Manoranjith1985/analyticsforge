import { useState } from 'react'
import { dashboardAPI } from '../../services/api'

const CHART_TYPES = [
  { value: 'bar',   label: '📊 Bar Chart' },
  { value: 'line',  label: '📈 Line Chart' },
  { value: 'area',  label: '🌊 Area Chart' },
  { value: 'pie',   label: '🥧 Pie Chart' },
  { value: 'table', label: '📋 Table' },
  { value: 'kpi',   label: '🔢 KPI Card' },
]

export default function AddWidgetModal({ dashboardId, datasources, onAdd, onClose }) {
  const [form, setForm] = useState({
    title: '',
    chart_type: 'bar',
    datasource_id: datasources[0]?.id || '',
    query: '',
    width: 4,
    height: 3,
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data } = await dashboardAPI.addWidget(dashboardId, form)
    onAdd(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-lg mb-5">Add Widget</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Widget Title</label>
            <input name="title" className="input" placeholder="e.g. Monthly Revenue"
              value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Chart Type</label>
            <select name="chart_type" className="input" value={form.chart_type} onChange={handleChange}>
              {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data Source</label>
            <select name="datasource_id" className="input" value={form.datasource_id} onChange={handleChange}>
              <option value="">No data source</option>
              {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Query (SQL or leave blank)</label>
            <textarea name="query" className="input font-mono text-xs h-24 resize-none"
              placeholder="SELECT category, SUM(revenue) AS total FROM sales GROUP BY category"
              value={form.query} onChange={handleChange} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Widget</button>
          </div>
        </form>
      </div>
    </div>
  )
}
