import { useState, useEffect } from 'react'
import { RiRobot2Line, RiPlayLine, RiBarChartBoxLine } from 'react-icons/ri'
import { automlAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function AutoMLPage() {
  const [datasources, setDatasources] = useState([])
  const [tab, setTab] = useState('train')
  const [trainForm, setTrainForm] = useState({ datasource_id: '', query: '', target_column: '', task_type: 'classification', test_size: 0.2 })
  const [clusterForm, setClusterForm] = useState({ datasource_id: '', query: '', n_clusters: 3 })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => { datasourceAPI.list().then(r => setDatasources(r.data)).catch(() => {}) }, [])

  const setT = (k, v) => setTrainForm(f => ({ ...f, [k]: v }))
  const setC = (k, v) => setClusterForm(f => ({ ...f, [k]: v }))

  const handleTrain = async (e) => {
    e.preventDefault()
    setRunning(true); setResult(null)
    try {
      const { data } = await automlAPI.train(trainForm)
      setResult(data)
      toast.success('Model trained!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Training failed') }
    finally { setRunning(false) }
  }

  const handleCluster = async (e) => {
    e.preventDefault()
    setRunning(true); setResult(null)
    try {
      const { data } = await automlAPI.cluster(clusterForm)
      setResult(data)
      toast.success('Clustering complete!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Clustering failed') }
    finally { setRunning(false) }
  }

  const renderMetrics = (metrics) => {
    if (!metrics) return null
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(metrics).map(([k, v]) => (
          <div key={k} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
            <p className="text-xs text-indigo-500 font-medium capitalize">{k.replace(/_/g, ' ')}</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">
              {typeof v === 'number' ? (v > 1 ? v.toFixed(2) : (v * 100).toFixed(1) + '%') : String(v)}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RiRobot2Line className="text-3xl text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AutoML</h1>
          <p className="text-gray-500 text-sm mt-0.5">Train ML models and run clustering — no code needed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['train','Train Model'],['cluster','Clustering']].map(([k,l]) => (
          <button key={k} onClick={() => { setTab(k); setResult(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {tab === 'train' ? (
            <form onSubmit={handleTrain} className="space-y-4">
              <h2 className="font-semibold text-gray-800">Train Classification / Regression Model</h2>
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={trainForm.datasource_id} onChange={e => setT('datasource_id', e.target.value)} required>
                  <option value="">— Select —</option>
                  {datasources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">SQL Query</label>
                <textarea className="input font-mono text-xs resize-none" rows={3} value={trainForm.query}
                  onChange={e => setT('query', e.target.value)} placeholder="SELECT * FROM your_table LIMIT 5000" required />
              </div>
              <div>
                <label className="label">Target Column (y)</label>
                <input className="input" value={trainForm.target_column} onChange={e => setT('target_column', e.target.value)} placeholder="e.g. churn, price" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Task Type</label>
                  <select className="input" value={trainForm.task_type} onChange={e => setT('task_type', e.target.value)}>
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
                <div>
                  <label className="label">Test Split</label>
                  <input type="number" className="input" min={0.1} max={0.5} step={0.05} value={trainForm.test_size} onChange={e => setT('test_size', Number(e.target.value))} />
                </div>
              </div>
              <button type="submit" disabled={running} className="btn-primary w-full flex items-center justify-center gap-2">
                <RiPlayLine /> {running ? 'Training…' : 'Train Model'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCluster} className="space-y-4">
              <h2 className="font-semibold text-gray-800">K-Means Clustering</h2>
              <div>
                <label className="label">Data Source</label>
                <select className="input" value={clusterForm.datasource_id} onChange={e => setC('datasource_id', e.target.value)} required>
                  <option value="">— Select —</option>
                  {datasources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">SQL Query</label>
                <textarea className="input font-mono text-xs resize-none" rows={3} value={clusterForm.query}
                  onChange={e => setC('query', e.target.value)} placeholder="SELECT * FROM your_table LIMIT 5000" required />
              </div>
              <div>
                <label className="label">Number of Clusters (k)</label>
                <input type="number" className="input" min={2} max={20} value={clusterForm.n_clusters} onChange={e => setC('n_clusters', Number(e.target.value))} />
              </div>
              <button type="submit" disabled={running} className="btn-primary w-full flex items-center justify-center gap-2">
                <RiPlayLine /> {running ? 'Clustering…' : 'Run Clustering'}
              </button>
            </form>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><RiBarChartBoxLine /> Results</h2>
          {!result && !running && <p className="text-gray-400 text-sm text-center py-12">Run the model to see results here.</p>}
          {running && <div className="text-center py-12 text-indigo-500 animate-pulse">Processing data…</div>}
          {result && !running && (
            <div className="space-y-4">
              {result.best_model && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-xs text-indigo-500 font-medium">Best Model</p>
                  <p className="text-lg font-bold text-indigo-800">{result.best_model}</p>
                </div>
              )}
              {result.metrics && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Metrics</p>
                  {renderMetrics(result.metrics)}
                </div>
              )}
              {result.all_models && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">All Models Compared</p>
                  <div className="space-y-2">
                    {Object.entries(result.all_models).map(([model, metrics]) => (
                      <div key={model} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${model === result.best_model ? 'bg-indigo-100 font-semibold text-indigo-800' : 'bg-gray-50 text-gray-600'}`}>
                        <span>{model}</span>
                        <span className="text-xs">{metrics.accuracy != null ? `Acc: ${(metrics.accuracy * 100).toFixed(1)}%` : metrics.r2 != null ? `R²: ${metrics.r2?.toFixed(3)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.inertia != null && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-medium">Inertia (lower is better)</p>
                  <p className="text-xl font-bold text-emerald-800">{result.inertia?.toFixed(2)}</p>
                  <p className="text-xs text-emerald-600 mt-1">Silhouette Score: {result.silhouette_score?.toFixed(3)}</p>
                </div>
              )}
              {result.cluster_summary && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Cluster Sizes</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(result.cluster_summary.cluster_sizes || {}).map(([k, v]) => (
                      <div key={k} className="bg-gray-100 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">Cluster {k}</p>
                        <p className="font-bold text-gray-800">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
