import { useState } from 'react'
import { RiCloseLine, RiAddLine } from 'react-icons/ri'
import { dashboardAPI } from '../../services/api'

const CHART_OPTIONS = [
  { value: 'bar', label: '📊 Bar Chart' },
  { value: 'line', label: '📈 Line Chart' },
  { value: 'area', label: '🌊 Area Chart' },
  { value: 'pie', label: '🥧 Pie Chart' },
  { value: 'donut', label: '🍩 Donut Chart' },
  { value: 'scatter', label: '✦ Scatter Plot' },
  { value: 'heatmap', label: '🔥 Heatmap' },
  { value: 'radar', label: '🕸 Radar Chart' },
  { value: 'treemap', label: '▦ Treemap' },
  { value: 'radialBar', label: '⭕ Radial Bar' },
  { value: 'polarArea', label: '🌐 Polar Area' },
  { value: 'bubble', label: '💭 Bubble Chart' },
  { value: 'candlestick', label: '📉 Candlestick' },
  { value: 'rangeBar', label: '≡ Range Bar' },
  { value: 'kpi', label: '🔢 KPI Card' },
  { value: 'table', label: '📋 Data Table' },
]

export default function AddWidgetModal({ dashboardId, datasources, onAdd, onClose }) {
  const [form, setForm] = useState({
    title: '',
    chart_type: 'bar',
    datasource_id: '',
    query: '',
    x_column: '',
    y_column: '',
    width: 4,
    height: 3,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError(null)
    try {
      const { data } = await dashboardAPI.addWidget(dashboardId, form)
      onAdd(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add widget')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">Add Widget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><RiCloseLine className="text-2xl" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="label">Widget Title</label>
            <input className="input" placeholder="e.g. Monthly Revenue" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div>
            <label className="label">Chart Type</label>
            <select className="input" value={form.chart_type} onChange={e => set('chart_type', e.target.value)}>
              {CHART_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Data Source</label>
            <select className="input" value={form.datasource_id} onChange={e => set('datasource_id', e.target.value)}>
              <option value="">— Select datasource —</option>
              {datasources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
            </select>
          </div>

          {form.datasource_id && (
            <div>
              <label className="label">SQL Query</label>
              <textarea
                className="input font-mono text-xs resize-none"
                rows={4}
                placeholder="SELECT category, SUM(revenue) as total FROM sales GROUP BY category"
                value={form.query}
                onChange={e => set('query', e.target.value)}
              />
            </div>
          )}

          {!['kpi','table','pie','donut','radialBar','polarArea','treemap'].includes(form.chart_type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">X Column (Category)</label>
                <input className="input" placeholder="e.g. category" value={form.x_column} onChange={e => set('x_column', e.target.value)} />
              </div>
              <div>
                <label className="label">Y Column (Value)</label>
                <input className="input" placeholder="e.g. total" value={form.y_column} onChange={e => set('y_column', e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Width (cols)</label>
              <input type="number" className="input" min={2} max={12} value={form.width} onChange={e => set('width', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Height (rows)</label>
              <input type="number" className="input" min={2} max={10} value={form.height} onChange={e => set('height', Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? 'Adding…' : <><RiAddLine /> Add Widget</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
