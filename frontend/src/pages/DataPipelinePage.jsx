import { useState, useEffect } from 'react'
import { RiAddLine, RiDeleteBinLine, RiPlayLine, RiArrowRightLine, RiGitMergeLine } from 'react-icons/ri'
import { pipelineAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

const STEP_TYPES = ['filter','transform','join','aggregate','sort','formula','ai_clean']

export default function DataPipelinePage() {
  const [pipelines, setPipelines] = useState([])
  const [datasources, setDatasources] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', datasource_id: '', steps: [] })

  useEffect(() => {
    pipelineAPI.list().then(r => setPipelines(r.data)).catch(() => {})
    datasourceAPI.list().then(r => setDatasources(r.data)).catch(() => {})
  }, [])

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { step_type: 'filter', config: {} }] }))
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
  const updateStep = (i, field, val) => setForm(f => {
    const steps = [...f.steps]; steps[i] = { ...steps[i], [field]: val }; return { ...f, steps }
  })
  const updateStepConfig = (i, key, val) => setForm(f => {
    const steps = [...f.steps]; steps[i] = { ...steps[i], config: { ...steps[i].config, [key]: val } }; return { ...f, steps }
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await pipelineAPI.create(form)
      setPipelines(p => [data, ...p])
      setShowCreate(false)
      setForm({ name: '', description: '', datasource_id: '', steps: [] })
      toast.success('Pipeline created!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleRun = async (pipeline) => {
    setSelected(pipeline); setRunning(true); setRunResult(null)
    try {
      const { data } = await pipelineAPI.run(pipeline.id, {})
      setRunResult(data)
      toast.success('Pipeline ran successfully!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Run failed') }
    finally { setRunning(false) }
  }

  const handleDelete = async (id) => {
    await pipelineAPI.delete(id)
    setPipelines(p => p.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Pipelines</h1>
          <p className="text-gray-500 text-sm mt-1">Build ETL workflows to transform your data</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> New Pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pipelines.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <RiGitMergeLine className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No pipelines yet. Create your first data pipeline.</p>
          </div>
        )}
        {pipelines.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{p.steps?.length || 0} steps</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRun(p)} disabled={running && selected?.id === p.id}
                  className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
                  <RiPlayLine /> {running && selected?.id === p.id ? 'Running…' : 'Run'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="btn-secondary text-sm px-3 py-1.5 text-red-500">
                  <RiDeleteBinLine />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Run Results */}
      {runResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Pipeline Output — {selected?.name}</h3>
          {runResult.columns && (
            <div className="overflow-auto">
              <table className="min-w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-indigo-50">
                    {runResult.columns.map(c => <th key={c} className="px-3 py-2 text-left text-indigo-700 font-semibold">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(runResult.rows || []).slice(0, 20).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {runResult.columns.map(c => <td key={c} className="px-3 py-1.5 text-gray-600">{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">{runResult.row_count} rows</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">New Pipeline</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Source Data Source</label>
                <select className="input" value={form.datasource_id} onChange={e => setForm(f => ({ ...f, datasource_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {datasources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Pipeline Steps</label>
                  <button type="button" onClick={addStep} className="btn-secondary text-xs px-2 py-1">+ Add Step</button>
                </div>
                <div className="space-y-3">
                  {form.steps.map((step, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-6">{i + 1}</span>
                        <select className="input flex-1 text-sm py-1" value={step.step_type} onChange={e => updateStep(i, 'step_type', e.target.value)}>
                          {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      </div>
                      {step.step_type === 'filter' && (
                        <input className="input text-xs py-1" placeholder="condition: e.g. revenue > 1000" value={step.config.condition || ''} onChange={e => updateStepConfig(i, 'condition', e.target.value)} />
                      )}
                      {step.step_type === 'sort' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input text-xs py-1" placeholder="column" value={step.config.column || ''} onChange={e => updateStepConfig(i, 'column', e.target.value)} />
                          <select className="input text-xs py-1" value={step.config.ascending ?? true} onChange={e => updateStepConfig(i, 'ascending', e.target.value === 'true')}>
                            <option value="true">Ascending</option>
                            <option value="false">Descending</option>
                          </select>
                        </div>
                      )}
                      {step.step_type === 'formula' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input text-xs py-1" placeholder="new_column" value={step.config.new_column || ''} onChange={e => updateStepConfig(i, 'new_column', e.target.value)} />
                          <input className="input text-xs py-1" placeholder="expression" value={step.config.expression || ''} onChange={e => updateStepConfig(i, 'expression', e.target.value)} />
                        </div>
                      )}
                      {['transform','aggregate','join','ai_clean'].includes(step.step_type) && (
                        <textarea className="input text-xs resize-none" rows={2} placeholder="JSON config…"
                          value={typeof step.config === 'object' ? JSON.stringify(step.config) : step.config}
                          onChange={e => { try { updateStep(i, 'config', JSON.parse(e.target.value)) } catch {} }} />
                      )}
                    </div>
                  ))}
                  {form.steps.length === 0 && <p className="text-gray-400 text-xs text-center py-4">No steps yet. Click "Add Step" to build your pipeline.</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Pipeline</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
