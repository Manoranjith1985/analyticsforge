import { useState, useEffect } from 'react'
import { RiDeleteBin6Line, RiRefreshLine } from 'react-icons/ri'
import { datasourceAPI } from '../../services/api'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function WidgetCard({ widget, onDelete }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (widget.datasource_id && widget.query) loadData()
  }, [widget])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: result } = await datasourceAPI.query(widget.datasource_id, widget.query)
      // Convert to recharts format
      const chartData = result.rows.map((row) =>
        Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
      )
      setData({ columns: result.columns, rows: chartData })
    } catch (e) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    if (!data || !data.rows.length) return <div className="text-gray-400 text-sm text-center py-8">No data</div>

    const cols = data.columns
    const xKey = cols[0]
    const yKeys = cols.slice(1).filter((c) => !isNaN(parseFloat(data.rows[0]?.[c])))

    const commonProps = {
      data: data.rows,
      margin: { top: 5, right: 10, left: 0, bottom: 5 },
    }

    switch (widget.chart_type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {yKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />)}
            </BarChart>
          </ResponsiveContainer>
        )
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {yKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        )
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              {yKeys.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length] + '33'} strokeWidth={2} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.rows} dataKey={yKeys[0] || cols[1]} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} label>
                {data.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      case 'table':
        return (
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium text-gray-600">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    {cols.map((c) => <td key={c} className="px-3 py-2 text-gray-700">{String(row[c] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'kpi':
        return (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600">{data.rows[0]?.[yKeys[0] || cols[0]]}</div>
              <div className="text-sm text-gray-500 mt-1">{yKeys[0] || cols[0]}</div>
            </div>
          </div>
        )
      default:
        return <div className="text-gray-400 text-sm text-center py-8">Unknown chart type: {widget.chart_type}</div>
    }
  }

  return (
    <div className="card group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 text-sm">{widget.title}</h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={loadData} className="text-gray-400 hover:text-primary-600">
            <RiRefreshLine />
          </button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <RiDeleteBin6Line />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading...</div>
      ) : error ? (
        <div className="text-red-500 text-sm text-center py-8">{error}</div>
      ) : (
        renderChart()
      )}
    </div>
  )
}
