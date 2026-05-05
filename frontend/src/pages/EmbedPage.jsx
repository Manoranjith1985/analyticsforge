import { useState, useEffect } from 'react'
import { RiAddLine, RiDeleteBinLine, RiCodeLine, RiCopyLine, RiExternalLinkLine } from 'react-icons/ri'
import { embedAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function EmbedPage() {
  const [tokens, setTokens] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [snippet, setSnippet] = useState(null)
  const [form, setForm] = useState({ name: '', dashboard_id: '', allowed_domains: '', expires_days: 30 })

  useEffect(() => { embedAPI.listTokens().then(r => setTokens(r.data)).catch(() => {}) }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        allowed_domains: form.allowed_domains ? form.allowed_domains.split(',').map(s => s.trim()) : [],
        expires_days: Number(form.expires_days),
      }
      const { data } = await embedAPI.createToken(payload)
      setTokens(t => [data, ...t])
      setShowCreate(false)
      setForm({ name: '', dashboard_id: '', allowed_domains: '', expires_days: 30 })
      toast.success('Embed token created!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleRevoke = async (id) => {
    await embedAPI.revokeToken(id)
    setTokens(t => t.filter(x => x.id !== id))
    toast.success('Token revoked')
  }

  const handleGetSnippet = async (id) => {
    try {
      const { data } = await embedAPI.getSnippet(id)
      setSnippet(data)
    } catch { toast.error('Error fetching snippet') }
  }

  const copySnippet = () => {
    if (snippet?.iframe_code) {
      navigator.clipboard.writeText(snippet.iframe_code)
      toast.success('Copied!')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Embed & White-label</h1>
          <p className="text-gray-500 text-sm mt-1">Generate embed tokens to publish dashboards anywhere</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> New Token
        </button>
      </div>

      {/* Tokens */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tokens.length === 0 ? (
          <div className="text-center py-16">
            <RiCodeLine className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No embed tokens yet.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Name','Dashboard','Views','Expires','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tokens.map(token => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 text-sm">{token.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{token.dashboard_id || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{token.view_count || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {token.expires_at ? format(new Date(token.expires_at), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleGetSnippet(token.id)} title="Get embed code"
                        className="text-indigo-500 hover:text-indigo-700 p-1"><RiCodeLine /></button>
                      <button onClick={() => handleRevoke(token.id)} title="Revoke"
                        className="text-gray-400 hover:text-red-500 p-1"><RiDeleteBinLine /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Snippet Display */}
      {snippet && (
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Embed Code</h3>
            <div className="flex gap-2">
              <button onClick={copySnippet} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs px-2 py-1 border border-gray-600 rounded">
                <RiCopyLine /> Copy
              </button>
              <button onClick={() => window.open(snippet.embed_url, '_blank')} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs px-2 py-1 border border-gray-600 rounded">
                <RiExternalLinkLine /> Preview
              </button>
              <button onClick={() => setSnippet(null)} className="text-gray-500 hover:text-white text-xs px-2 py-1">✕</button>
            </div>
          </div>
          <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono bg-black rounded-lg p-3">
            {snippet.iframe_code}
          </pre>
          <p className="text-gray-500 text-xs">Embed URL: <span className="text-gray-300">{snippet.embed_url}</span></p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">New Embed Token</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Token Name</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer Portal Embed" required />
              </div>
              <div>
                <label className="label">Dashboard ID (optional)</label>
                <input className="input" value={form.dashboard_id} onChange={e => setForm(f => ({ ...f, dashboard_id: e.target.value }))} placeholder="Leave blank for all dashboards" />
              </div>
              <div>
                <label className="label">Allowed Domains (comma-separated)</label>
                <input className="input" value={form.allowed_domains} onChange={e => setForm(f => ({ ...f, allowed_domains: e.target.value }))} placeholder="e.g. yoursite.com, app.yoursite.com" />
                <p className="text-xs text-gray-400 mt-1">Leave empty to allow all domains</p>
              </div>
              <div>
                <label className="label">Expires In (days)</label>
                <input type="number" className="input" min={1} max={365} value={form.expires_days} onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Token</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
