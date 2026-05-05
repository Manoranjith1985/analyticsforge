import { useState, useEffect } from 'react'
import ReactApexChart from 'react-apexcharts'
import { RiDeleteBinLine, RiDraggable, RiRefreshLine } from 'react-icons/ri'
import { datasourceAPI } from '../../services/api'

const APEX_TYPES = ['bar','line','area','pie','donut','scatter','heatmap','radar','treemap','candlestick','rangeBar','radialBar','polarArea','bubble']
const PALETTE = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

function buildSeries(data, widget) {
  if (!data?.rows?.length) return []
  const cols = data.columns || []
  const xCol = widget.x_column || cols[0]
  const yCol = widget.y_column || cols[1]
  const rows = data.rows
  if (['pie','donut','radialBar','polarArea'].includes(widget.chart_type)) {
    return [{ data: rows.map(r => Number(r[yCol]) || 0) }]
  }
  if (widget.chart_type === 'heatmap') {
    return [{ name: yCol, data: rows.map(r => ({ x: String(r[xCol]), y: Number(r[yCol]) || 0 })) }]
  }
  if (widget.chart_type === 'scatter' || widget.chart_type === 'bubble') {
    return [{ name: yCol, data: rows.map(r => [Number(r[xCol]) || 0, Number(r[yCol]) || 0]) }]
  }
  return [{ name: yCol || 'Value', data: rows.map(r => Number(r[yCol]) || 0) }]
}

function buildLabels(data, widget) {
  if (!data?.rows?.length) return []
  const cols = data.columns || []
  const xCol = widget.x_column || cols[0]
  return data.rows.map(r => String(r[xCol]))
}

function buildOptions(widget, labels, theme) {
  const isDark = theme === 'dark'
  const tc = isDark ? '#e5e7eb' : '#374151'
  const gc = isDark ? '#374151' : '#f3f4f6'
  const base = {
    chart: { background: 'transparent', toolbar: { show: false }, animations: { enabled: true, speed: 400 }, foreColor: tc },
    colors: PALETTE,
    grid: { borderColor: gc, strokeDashArray: 3 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    legend: { labels: { colors: tc } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
  }
  if (['pie','donut','radialBar','polarArea'].includes(widget.chart_type)) {
    base.labels = labels
    base.plotOptions = { pie: { donut: { size: '65%' } } }
  } else if (widget.chart_type === 'bar' || widget.chart_type === 'rangeBar') {
    base.xaxis = { categories: labels, labels: { style: { colors: tc } } }
    base.plotOptions = { bar: { borderRadius: 4, columnWidth: '55%' } }
  } else if (widget.chart_type === 'treemap' || widget.chart_type === 'heatmap') {
    base.dataLabels = { enabled: true }
  } else if (widget.chart_type === 'radar') {
    base.xaxis = { categories: labels }
  } else {
    base.xaxis = { categories: labels, labels: { style: { colors: tc } } }
    base.yaxis = { labels: { style: { colors: tc } } }
    if (widget.chart_type === 'area') {
      base.fill = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } }
    }
  }
  return base
}

function KpiWidget({ widget, data }) {
  const rows = data?.rows
  const value = rows?.length ? Object.values(rows[0])[0] : widget.kpi_value ?? '--'
  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <p className="text-4xl font-extrabold text-indigo-600">{isNaN(Number(value)) ? value : Number(value).toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{widget.title}</p>
      {widget.kpi_change != null && (
        <span className={`text-xs mt-2 px-2 py-0.5 rounded-full font-medium ${Number(widget.kpi_change) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {Number(widget.kpi_change) >= 0 ? '▲' : '▼'} {Math.abs(Number(widget.kpi_change))}%
        </span>
      )}
    </div>
  )
}

function TableWidget({ data }) {
  const cols = data?.columns || []
  const rows = data?.rows || []
  return (
    <div className="overflow-auto h-full">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-gray-100">
            {cols.map(c => <th key={c} className="px-3 py-2 text-left font-semibold text-gray-600">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {cols.map(c => <td key={c} className="px-3 py-1.5 text-gray-700">{String(row[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function WidgetCard({ widget, theme, onDelete }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!widget.datasource_id || !widget.query) return
    setLoading(true); setError(null)
    try {
      const { data: res } = await datasourceAPI.query(widget.datasource_id, widget.query)
      setData(res)
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [widget.id])

  const labels = buildLabels(data, widget)
  const series = buildSeries(data, widget)
  const options = buildOptions(widget, labels, theme)

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm animate-pulse">Loading…</div>
    if (error) return <div className="flex items-center justify-center h-full text-red-400 text-sm">{error}</div>
    if (widget.chart_type === 'kpi') return <KpiWidget widget={widget} data={data} />
    if (widget.chart_type === 'table') return data ? <TableWidget data={data} /> : <div className="flex items-center justify-center h-full text-gray-300 text-sm">No data</div>
    if (!APEX_TYPES.includes(widget.chart_type)) return <KpiWidget widget={widget} data={data} />
    if (!series[0]?.data?.length) return <div className="flex items-center justify-center h-full text-gray-300 text-sm">No data yet – configure query</div>
    return (
      <ReactApexChart type={widget.chart_type} series={series} options={options} height="100%" width="100%" />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none">
        <span className="text-sm font-semibold text-gray-700 truncate">{widget.title}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Refresh"><RiRefreshLine className="text-sm" /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1 rounded" title="Delete"><RiDeleteBinLine className="text-sm" /></button>
          <RiDraggable className="text-gray-300 text-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-2">{renderContent()}</div>
    </div>
  )
}
