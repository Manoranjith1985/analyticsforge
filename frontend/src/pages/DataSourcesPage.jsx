import { useState, useEffect, useRef } from 'react'
import { RiAddLine, RiDatabase2Line, RiDeleteBinLine, RiUploadLine } from 'react-icons/ri'
import { datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

const CONNECTOR_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql',      label: 'MySQL' },
  { value: 'sqlite',     label: 'SQLite' },
  { value: 'csv',        label: 'CSV File' },
  { value: 'excel',      label: 'Excel' },
  { value: 'rest_api',   label: 'REST API' },
  { value: 'google_sheets', label: 'Google Sheets' },
]

export default function DataSourcesPage() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', connector_type: 'postgresql', connection_config: '{}' })
  const fileRef = useRef()

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    try {
      const { data } = await datasourceAPI.list()
      setSources(data)
    } catch { toast.error('Failed to load data sources') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      JSON.parse(form.connection_config) // validate JSON
    } catch {
      return toast.error('Connection config must be valid JSON')
    }
    try {
      await datasourceAPI.create({
        ...form,
        connection_config: JSON.parse(form.connection_config),
      })
      toast.success('Data source connected!')
      setShowCreate(false)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create data source')
    }
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      await datasourceAPI.uploadCsv(file)
      toast.success(`${file.name} uploaded!`)
      fetch()
    } catch {
      toast.error('Upload failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this data source?')) return
    await datasourceAPI.delete(id)
    setSources(sources.filter((s) => s.id !== id))
    toast.success('Data source removed')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
          <p className="text-gray-500 text-sm mt-1">Connect databases, files, and APIs</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button className="btn-secondary flex items-center gap-2" onClick={() => fileRef.current?.click()}>
            <RiUploadLine /> Upload CSV
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <RiAddLine /> Connect Source
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="font-semibold text-lg mb-5">Connect Data Source</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="My Database" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Connector Type</label>
                <select className="input" value={form.connector_type}
                  onChange={(e) => setForm({ ...form, connector_type: e.target.value })}>
                  {CONNECTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Connection Config (JSON)</label>
                <textarea className="input font-mono text-xs h-28 resize-none"
                  placeholder='{"host": "localhost", "port": 5432, "user": "postgres", "password": "...", "database": "mydb"}'
                  value={form.connection_config}
                  onChange={(e) => setForm({ ...form, connection_config: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Connect</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : sources.length === 0 ? (
        <div className="text-center py-20">
          <RiDatabase2Line className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No data sources connected</p>
          <p className="text-gray-400 text-sm">Connect a database or upload a CSV to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sources.map((s) => (
            <div key={s.id} className="card group">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                  <RiDatabase2Line className="text-blue-600 text-xl" />
                </div>
                <button onClick={() => handleDelete(s.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                  <RiDeleteBinLine />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900">{s.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 capitalize">
                  {s.connector_type}
                </span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
