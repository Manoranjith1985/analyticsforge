import { useState, useRef, useEffect } from 'react'
import { RiSendPlanLine, RiRobotLine, RiUserLine, RiDatabase2Line } from 'react-icons/ri'
import { aiAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the AnalyticsForge AI assistant. Ask me anything about your data — I can generate SQL queries, provide insights, detect anomalies, and explain trends. Select a data source below to get started!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [datasources, setDatasources] = useState([])
  const [selectedDs, setSelectedDs] = useState('')
  const [mode, setMode] = useState('chat') // chat | nl-sql | insights
  const bottomRef = useRef()

  useEffect(() => {
    datasourceAPI.list().then(({ data }) => setDatasources(data)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      let response = ''
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      if (mode === 'nl-sql' && selectedDs) {
        const { data } = await aiAPI.nlToSql(selectedDs, input)
        response = `**Generated SQL:**\n\`\`\`sql\n${data.sql}\n\`\`\``
      } else if (mode === 'insights' && selectedDs) {
        const { data } = await aiAPI.insights(selectedDs, 'SELECT * FROM your_table LIMIT 100', input)
        response = data.insights
      } else {
        const { data } = await aiAPI.chat(input, history, selectedDs || undefined)
        response = data.response
      }

      setMessages((m) => [...m, { role: 'assistant', content: response }])
    } catch (err) {
      toast.error('AI request failed. Check your API key configuration.')
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ Sorry, I encountered an error. Please check the backend API configuration.' }])
    } finally {
      setLoading(false)
    }
  }

  const formatContent = (content) => {
    // Simple markdown-ish rendering for code blocks
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```\w*\n?/, '').replace(/```$/, '')
        return <pre key={i} className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-auto my-2">{code}</pre>
      }
      return <span key={i} className="whitespace-pre-wrap">{part.replace(/\*\*(.*?)\*\*/g, '$1')}</span>
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-500 text-sm mt-1">Ask questions about your data in natural language</p>
      </div>

      {/* Mode + DS selector */}
      <div className="flex gap-3 mb-4">
        <select className="input w-40" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="chat">💬 Chat</option>
          <option value="nl-sql">🔍 NL → SQL</option>
          <option value="insights">💡 Insights</option>
        </select>
        <select className="input flex-1 max-w-xs" value={selectedDs} onChange={(e) => setSelectedDs(e.target.value)}>
          <option value="">No data source</option>
          {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RiRobotLine className="text-primary-600" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
            }`}>
              {formatContent(msg.content)}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RiUserLine className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <RiRobotLine className="text-primary-600" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-3 mt-4">
        <input
          className="input flex-1"
          placeholder={
            mode === 'nl-sql' ? 'Ask a question to get SQL...' :
            mode === 'insights' ? 'What insights do you want?' :
            'Ask anything about your data...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary px-5 flex items-center gap-2" disabled={loading || !input.trim()}>
          <RiSendPlanLine />
        </button>
      </form>
    </div>
  )
}
