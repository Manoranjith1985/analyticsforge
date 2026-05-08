import { useState, useEffect, useRef } from 'react'
import {
  RiAddLine, RiDatabase2Line, RiDeleteBinLine, RiUploadLine,
  RiCloseLine, RiCheckLine, RiRefreshLine, RiLinkM,
  RiGlobalLine, RiSettingsLine, RiPlayLine
} from 'react-icons/ri'
import { datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

// ── Connector catalogue ────────────────────────────────────────────────────────
const CONNECTORS = [
  // ── Databases
  {
    group: 'Databases',
    value: 'postgresql', label: 'PostgreSQL',
    color: 'bg-blue-100 text-blue-700', icon: '🐘',
    description: 'Connect to a PostgreSQL database',
    fields: [
      { key: 'host',     label: 'Host',     placeholder: 'localhost',  type: 'text' },
      { key: 'port',     label: 'Port',     placeholder: '5432',       type: 'number' },
      { key: 'database', label: 'Database', placeholder: 'mydb',       type: 'text' },
      { key: 'user',     label: 'Username', placeholder: 'postgres',   type: 'text' },
      { key: 'password', label: 'Password', placeholder: '••••••••',   type: 'password' },
    ],
  },
  {
    group: 'Databases',
    value: 'mysql', label: 'MySQL',
    color: 'bg-orange-100 text-orange-700', icon: '🐬',
    description: 'Connect to a MySQL or MariaDB database',
    fields: [
      { key: 'host',     label: 'Host',     placeholder: 'localhost', type: 'text' },
      { key: 'port',     label: 'Port',     placeholder: '3306',      type: 'number' },
      { key: 'database', label: 'Database', placeholder: 'mydb',      type: 'text' },
      { key: 'user',     label: 'Username', placeholder: 'root',      type: 'text' },
      { key: 'password', label: 'Password', placeholder: '••••••••',  type: 'password' },
    ],
  },
  {
    group: 'Databases',
    value: 'sqlite', label: 'SQLite',
    color: 'bg-gray-100 text-gray-700', icon: '🗄️',
    description: 'Connect to a local SQLite database file',
    fields: [
      { key: 'file_path', label: 'File Path', placeholder: '/data/mydb.db', type: 'text' },
    ],
  },
  // ── Files
  {
    group: 'Files',
    value: 'csv', label: 'CSV File',
    color: 'bg-green-100 text-green-700', icon: '📄',
    description: 'Query a CSV file on the server',
    fields: [
      { key: 'file_path', label: 'File Path', placeholder: '/uploads/data.csv', type: 'text' },
    ],
  },
  {
    group: 'Files',
    value: 'excel', label: 'Excel',
    color: 'bg-emerald-100 text-emerald-700', icon: '📊',
    description: 'Query an Excel spreadsheet',
    fields: [
      { key: 'file_path',   label: 'File Path',   placeholder: '/uploads/data.xlsx', type: 'text' },
      { key: 'sheet_name',  label: 'Sheet Name',  placeholder: 'Sheet1 (optional)',  type: 'text', optional: true },
    ],
  },
  // ── Web / API
  {
    group: 'Web & APIs',
    value: 'rest_api', label: 'REST API',
    color: 'bg-purple-100 text-purple-700', icon: '🌐',
    description: 'Fetch data from any REST API endpoint',
    fields: [
      { key: 'url',     label: 'URL',    placeholder: 'https://api.example.com/data', type: 'text' },
    ],
    advancedJson: true,
    advancedLabel: 'Headers / Params (JSON)',
    advancedPlaceholder: '{"headers": {"Authorization": "Bearer token"}, "params": {"limit": 100}}',
  },
  // ── ITSM
  {
    group: 'ITSM & Project Tools',
    value: 'jira', label: 'Jira',
    color: 'bg-indigo-100 text-indigo-700', icon: '🎯',
    description: 'Connect to Jira Server, Data Center, or Cloud',
    fields: [
      { key: 'base_url',  label: 'Jira URL',       placeholder: 'https://jira.company.com',  type: 'text' },
      { key: 'username',  label: 'Username / Email', placeholder: 'admin@company.com',        type: 'text' },
      { key: 'api_token', label: 'API Token / Password', placeholder: '••••••••',             type: 'password' },
    ],
    selectFields: [
      {
        key: 'auth_type', label: 'Auth Type', defaultValue: 'basic',
        options: [
          { value: 'basic', label: 'Basic Auth (username + token/password)' },
          { value: 'pat',   label: 'Personal Access Token (Server/DC 8.14+)' },
        ],
      },
    ],
    queryHelp: [
      'issues: project = PM AND status = "In Progress"',
      'projects',
      'boards',
      'sprints: 42   (board ID)',
      'users',
      'components: PM   (project key)',
      'worklogs: PM-123   (issue key)',
    ],
  },
  {
    group: 'ITSM & Project Tools',
    value: 'servicenow', label: 'ServiceNow',
    color: 'bg-green-100 text-green-700', icon: '❄️',
    description: 'Connect to a ServiceNow instance via the Table API',
    fields: [
      { key: 'instance', label: 'Instance', placeholder: 'company  (or https://company.service-now.com)', type: 'text' },
      { key: 'username', label: 'Username', placeholder: 'admin', type: 'text' },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
    ],
    queryHelp: [
      'incident',
      'incident: active=true^priority=1',
      'change_request: state=implement',
      'problem',
      'sys_user: active=true',
      'cmdb_ci',
      'task',
      'sc_req_item',
    ],
  },
  {
    group: 'ITSM & Project Tools',
    value: 'servicedesk_plus', label: 'ServiceDesk Plus',
    color: 'bg-red-100 text-red-700', icon: '🛠️',
    description: 'Connect to ManageEngine ServiceDesk Plus via the v3 API',
    fields: [
      { key: 'base_url', label: 'Base URL',    placeholder: 'https://sdp.company.com', type: 'text' },
      { key: 'api_key',  label: 'Technician API Key', placeholder: '••••••••',         type: 'password' },
    ],
    selectFields: [
      {
        key: 'version', label: 'API Version', defaultValue: 'v3',
        options: [
          { value: 'v3', label: 'v3 (recommended)' },
          { value: 'v2', label: 'v2 (legacy)' },
        ],
      },
    ],
    queryHelp: [
      'requests',
      'problems',
      'changes',
      'assets',
      'projects',
      'workorders',
    ],
  },
]

const CONNECTOR_MAP = Object.fromEntries(CONNECTORS.map(c => [c.value, c]))

// Icon badge colours per connector
function ConnectorBadge({ type }) {
  const c = CONNECTOR_MAP[type]
  if (!c) return (
    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 capitalize">{type}</span>
  )
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  )
}

// ── Smart connector form ───────────────────────────────────────────────────────
function ConnectorForm({ connector, values, onChange }) {
  if (!connector) return null

  return (
    <div className="space-y-3">
      {/* Standard text/password/number fields */}
      {connector.fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {f.label}{f.optional && <span className="text-gray-400 ml-1">(optional)</span>}
          </label>
          <input
            type={f.type}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={f.placeholder}
            value={values[f.key] || ''}
            onChange={e => onChange({ ...values, [f.key]: e.target.value })}
            required={!f.optional}
          />
        </div>
      ))}

      {/* Select dropdowns */}
      {(connector.selectFields || []).map(sf => (
        <div key={sf.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{sf.label}</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={values[sf.key] || sf.defaultValue}
            onChange={e => onChange({ ...values, [sf.key]: e.target.value })}
          >
            {sf.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ))}

      {/* Advanced JSON (REST API extra headers/params) */}
      {connector.advancedJson && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{connector.advancedLabel}</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono h-20 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={connector.advancedPlaceholder}
            value={values.__advanced || ''}
            onChange={e => onChange({ ...values, __advanced: e.target.value })}
          />
        </div>
      )}

      {/* Query help tips */}
      {connector.queryHelp && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-indigo-700 mb-1.5">Query examples:</p>
          <div className="space-y-1">
            {connector.queryHelp.map((q, i) => (
              <code key={i} className="block text-xs text-indigo-900 font-mono">{q}</code>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Build the connection_config from the form values
function buildConfig(connector, values) {
  const config = {}
  connector.fields.forEach(f => {
    if (values[f.key]) config[f.key] = f.type === 'number' ? Number(values[f.key]) : values[f.key]
  });
  (connector.selectFields || []).forEach(sf => {
    config[sf.key] = values[sf.key] || sf.defaultValue
  })
  if (connector.advancedJson && values.__advanced) {
    try {
      const extra = JSON.parse(values.__advanced)
      Object.assign(config, extra)
    } catch { /* ignore invalid JSON */ }
  }
  return config
}

// ── Connector picker modal ────────────────────────────────────────────────────
function ConnectorPicker({ onSelect, onClose }) {
  const groups = [...new Set(CONNECTORS.map(c => c.group))]
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Choose a Connector</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select the type of data source to connect</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <RiCloseLine className="text-xl" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-5">
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONNECTORS.filter(c => c.group === group).map(c => (
                  <button
                    key={c.value}
                    onClick={() => onSelect(c)}
                    className="flex items-center gap-2.5 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl px-3 py-2.5 text-left transition-all group"
                  >
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 leading-tight">{c.label}</p>
                      <p className="text-xs text-gray-400 leading-tight">{c.group}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Connection setup modal ────────────────────────────────────────────────────
function SetupModal({ connector, onClose, onCreate }) {
  const [name, setName] = useState(`My ${connector.label}`)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const config = buildConfig(connector, values)
      await onCreate({ name, connector_type: connector.value, connection_config: config })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${connector.color}`}>
              {connector.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Connect {connector.label}</h3>
              <p className="text-xs text-gray-400">{connector.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <RiCloseLine className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="setup-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Connection Name</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <ConnectorForm connector={connector} values={values} onChange={setValues} />
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" form="setup-form" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connecting…</>
              : <><RiLinkM /> Connect</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Query tester panel (inline) ───────────────────────────────────────────────
function QueryPanel({ source, onClose }) {
  const connector = CONNECTOR_MAP[source.connector_type]
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    if (!query.trim()) return
    setRunning(true)
    try {
      const { data } = await datasourceAPI.query(source.id, query)
      setResult(data)
      toast.success(`${data.row_count} row${data.row_count !== 1 ? 's' : ''} returned`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Query failed')
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${connector?.color || 'bg-gray-100 text-gray-600'}`}>
              {connector?.icon || '🗄️'}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{source.name}</h3>
              <p className="text-xs text-gray-400">{connector?.label || source.connector_type} — Query Tester</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <RiCloseLine className="text-xl" />
          </button>
        </div>

        {/* Query input */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              rows={3}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={
                source.connector_type === 'jira'            ? 'issues: project = PM AND status = "In Progress"' :
                source.connector_type === 'servicenow'      ? 'incident: active=true^priority=1' :
                source.connector_type === 'servicedesk_plus'? 'requests' :
                'SELECT * FROM table_name LIMIT 100'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button
              onClick={run}
              disabled={running || !query.trim()}
              className="flex items-center gap-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm self-end h-10 transition-colors"
            >
              {running
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <RiPlayLine />
              }
              Run
            </button>
          </div>
          {/* Query help */}
          {connector?.queryHelp && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {connector.queryHelp.map((q, i) => (
                <button key={i} onClick={() => setQuery(q)}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1 font-mono transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {result ? (
            <div>
              <p className="text-xs text-gray-400 mb-2">{result.row_count} rows — {result.columns.length} columns</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      {result.columns.map(c => (
                        <th key={c} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 200).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-xs truncate">
                            {cell === null || cell === undefined ? <span className="text-gray-300 italic">null</span> : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.row_count > 200 && (
                <p className="text-xs text-gray-400 mt-2">Showing first 200 of {result.row_count} rows</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Run a query to see results here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DataSourcesPage() {
  const [sources, setSources]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(null)   // null | 'pick' | 'setup'
  const [selectedConnector, setSelected] = useState(null)
  const [querySource, setQuerySource]   = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchSources() }, [])

  const fetchSources = async () => {
    try {
      const { data } = await datasourceAPI.list()
      setSources(data)
    } catch { toast.error('Failed to load data sources') }
    finally { setLoading(false) }
  }

  const handleCreate = async (payload) => {
    try {
      await datasourceAPI.create(payload)
      toast.success(`${payload.name} connected!`)
      setModal(null)
      setSelected(null)
      fetchSources()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to connect data source')
    }
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      await datasourceAPI.uploadCsv(file)
      toast.success(`${file.name} uploaded!`)
      fetchSources()
    } catch { toast.error('Upload failed') }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this data source?')) return
    await datasourceAPI.delete(id)
    setSources(s => s.filter(x => x.id !== id))
    toast.success('Data source removed')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
          <p className="text-gray-500 text-sm mt-1">Connect databases, ITSM tools, and APIs</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            onClick={() => fileRef.current?.click()}>
            <RiUploadLine /> Upload CSV
          </button>
          <button
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
            onClick={() => setModal('pick')}>
            <RiAddLine /> Connect Source
          </button>
        </div>
      </div>

      {/* Connector groups legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[...new Set(CONNECTORS.map(c => c.group))].map(g => (
          <span key={g} className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">{g}</span>
        ))}
      </div>

      {/* Sources grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <span className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mr-3" />
          Loading data sources…
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-20">
          <RiDatabase2Line className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold text-lg">No data sources connected</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Connect a database, ITSM tool, or upload a CSV to get started</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setModal('pick')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
              <RiAddLine /> Connect Source
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold text-sm">
              <RiUploadLine /> Upload CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map(s => {
            const c = CONNECTOR_MAP[s.connector_type]
            return (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer"
                onClick={() => setQuerySource(s)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c?.color || 'bg-gray-100'}`}>
                    {c?.icon || '🗄️'}
                  </div>
                  <button
                    onClick={e => handleDelete(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <RiDeleteBinLine />
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <ConnectorBadge type={s.connector_type} />
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? '● Active' : '● Inactive'}
                  </span>
                </div>
                <p className="text-xs text-indigo-500 mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <RiPlayLine /> Click to run a query
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {modal === 'pick' && (
        <ConnectorPicker
          onSelect={c => { setSelected(c); setModal('setup') }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'setup' && selectedConnector && (
        <SetupModal
          connector={selectedConnector}
          onClose={() => { setModal(null); setSelected(null) }}
          onCreate={handleCreate}
        />
      )}

      {querySource && (
        <QueryPanel
          source={querySource}
          onClose={() => setQuerySource(null)}
        />
      )}
    </div>
  )
}
