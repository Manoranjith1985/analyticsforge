import { useState, useEffect } from 'react'
import { RiLineChartLine, RiBarChartLine } from 'react-icons/ri'
import { analyticsAPI, datasourceAPI } from '../services/api'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'

export default function AnalyticsPage() {
  const [datasources, setDatasources] = useState([])
  const [tab, setTab] = useState('forecast')
  const [forecastForm, setForecastForm] = useState({ datasource_id: '', query: '', date_column: '', value_column: '', periods: 12 })
  const [statsForm, setStatsForm] = useState({ datasource_id: '', query: '', column: '' })
  const [forecastResult, setForecastResult] = useState(null)
  const [statsResult, setStatsResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    datasourceAPI.list().then(({ data }) => setDatasources(data)).catch(() => {})
  }, [])

  const runForecast = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await analyticsAPI.forecast({ ...forecastForm, periods: Number(forecastForm.periods) })
      setForecastResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Forecast failed')
    } finally {
      setLoading(false)
    }
  }

  const runStats = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await analyticsAPI.stats(statsForm)
      setStatsResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Stats failed')
    } finally {
      setLoading(false)
    }
  }

  const combined = forecastResult
    ? [
        ...forecastResult.historical.slice(-24).map((d) => ({ ...d, type: 'historical' })),
        ...forecastResult.forecast.map((d) => ({ date: d.date, predicted: d.predicted, type: 'forecast' })),
      ]
    : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Forecasting, statistical analysis, and predictive insights</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[{ key: 'forecast', label: '📈 Forecasting' }, { key: 'stats', label: '📊 Descriptive Stats' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'forecast' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Forecast Settings</h3>
            <form onSubmit={runForecast} className="space-y-4">
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={forecastForm.datasource_id}
                  onChange={(e) => setForecastForm({ ...forecastForm, datasource_id: e.target.value })} required>
                  <option value="">Select...</option>
                  {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">SQL Query</label>
                <textarea className="input font-mono text-xs h-20 resize-none"
                  value={forecastForm.query}
                  onChange={(e) => setForecastForm({ ...forecastForm, query: e.target.value })}
                  placeholder="SELECT date, revenue FROM sales ORDER BY date" required />
              </div>
              <div>
                <label className="label">Date Column</label>
                <input className="input" value={forecastForm.date_column}
                  onChange={(e) => setForecastForm({ ...forecastForm, date_column: e.target.value })}
                  placeholder="date" required />
              </div>
              <div>
                <label className="label">Value Column</label>
                <input className="input" value={forecastForm.value_column}
                  onChange={(e) => setForecastForm({ ...forecastForm, value_column: e.target.value })}
                  placeholder="revenue" required />
              </div>
              <div>
                <label className="label">Forecast Periods</label>
                <input type="number" className="input" value={forecastForm.periods} min={1} max={60}
                  onChange={(e) => setForecastForm({ ...forecastForm, periods: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Running...' : 'Run Forecast'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-gray-900 mb-4">Forecast Chart</h3>
            {!forecastResult ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <RiLineChartLine className="text-5xl mx-auto mb-2 text-gray-300" />
                  <p>Configure and run a forecast to see results</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={forecastForm.value_column} stroke="#6366f1" strokeWidth={2} dot={false} name="Historical" />
                  <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Stats Settings</h3>
            <form onSubmit={runStats} className="space-y-4">
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={statsForm.datasource_id}
                  onChange={(e) => setStatsForm({ ...statsForm, datasource_id: e.target.value })} required>
                  <option value="">Select...</option>
                  {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">SQL Query</label>
                <textarea className="input font-mono text-xs h-20 resize-none"
                  value={statsForm.query}
                  onChange={(e) => setStatsForm({ ...statsForm, query: e.target.value })}
                  placeholder="SELECT * FROM sales" required />
              </div>
              <div>
                <label className="label">Numeric Column to Analyze</label>
                <input className="input" value={statsForm.column}
                  onChange={(e) => setStatsForm({ ...statsForm, column: e.target.value })}
                  placeholder="revenue" required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Running...' : 'Analyze'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-gray-900 mb-4">Statistical Summary</h3>
            {!statsResult ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <RiBarChartLine className="text-5xl mx-auto mb-2 text-gray-300" />
                  <p>Run an analysis to see results</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(statsResult).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">{value.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
