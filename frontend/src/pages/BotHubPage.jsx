import { useState, useEffect, useRef } from 'react'
import {
  RiRobotLine, RiMicLine, RiMicOffLine, RiSendPlaneLine,
  RiFlashlightLine, RiShieldCheckLine, RiUserLine,
  RiVolumeUpLine, RiVolumeMuteLine, RiRefreshLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiAlertLine,
  RiBrainLine, RiRobot2Line, RiGroupLine,
} from 'react-icons/ri'
import { aiAPI, qbotAPI, virtualSupervisorAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── mock fallback data ──────────────────────────────────────────────────── */
const MOCK_ALERTS = [
  { id: 1, rule: 'High CPU Alert',    host: 'prod-web-01', severity: 'critical', status: 'open' },
  { id: 2, rule: 'Disk Space Warning', host: 'prod-db-01', severity: 'warning',  status: 'acknowledged' },
]
const MOCK_RUNS = [
  { id: 1, suite: 'API Health Checks', passed: 12, failed: 0, status: 'passed', duration: '45s' },
  { id: 2, suite: 'Auth Flow Tests',   passed: 7,  failed: 1, status: 'failed', duration: '1m 20s' },
]

/* ── helpers ─────────────────────────────────────────────────────────────── */
function speak(text, voiceName, onEnd) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  if (voiceName) {
    const v = window.speechSynthesis.getVoices().find(v => v.name === voiceName)
    if (v) utt.voice = v
  }
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

/* ── stat badge ──────────────────────────────────────────────────────────── */
function BotCard({ icon, name, status, desc, color, onClick, active }) {
  const palette = {
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    blue:   'bg-blue-100 text-blue-600 border-blue-200',
    emerald:'bg-emerald-100 text-emerald-600 border-emerald-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
  }
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left w-full ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
        {status}
      </span>
    </button>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function BotHubPage() {
  const [activeBot, setActiveBot]   = useState('ai')   // 'ai' | 'voice' | 'qbot' | 'vsupervisor'
  const [messages, setMessages]     = useState([
    { role: 'bot', text: '👋 Welcome to Bot Hub! I\'m your unified Connect Pro assistant. Ask me anything or switch bots using the panel on the left.', ts: new Date().toLocaleTimeString(), bot: 'ai' }
  ])
  const [input, setInput]           = useState('')
  const [thinking, setThinking]     = useState(false)
  const [listening, setListening]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [muted, setMuted]           = useState(false)
  const [transcript, setTranscript] = useState('')
  const [alerts, setAlerts]         = useState([])
  const [runs, setRuns]             = useState([])
  const [loadingPanel, setLoadingPanel] = useState(false)

  const recogRef  = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  useEffect(() => {
    if (activeBot === 'vsupervisor') loadAlerts()
    if (activeBot === 'qbot') loadRuns()
  }, [activeBot])

  const loadAlerts = async () => {
    setLoadingPanel(true)
    try { const r = await virtualSupervisorAPI.listAlerts(); setAlerts(r.data) }
    catch { setAlerts(MOCK_ALERTS) }
    finally { setLoadingPanel(false) }
  }

  const loadRuns = async () => {
    setLoadingPanel(true)
    try { const r = await qbotAPI.listRuns(); setRuns(r.data) }
    catch { setRuns(MOCK_RUNS) }
    finally { setLoadingPanel(false) }
  }

  const addMessage = (role, text, bot) => {
    setMessages(prev => [...prev, { role, text, ts: new Date().toLocaleTimeString(), bot: bot || activeBot }])
  }

  const sendMessage = async (text) => {
    if (!text.trim()) return
    const userText = text.trim()
    addMessage('user', userText)
    setInput('')
    setThinking(true)
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
      const res = await aiAPI.chat(userText, history, null)
      const reply = res.data?.response || res.data?.answer || 'Got it! Let me help you with that.'
      addMessage('bot', reply)
      if (!muted) { setSpeaking(true); speak(reply, '', () => setSpeaking(false)) }
    } catch {
      const fallback = `You asked: "${userText}". Please connect the AI backend for live responses.`
      addMessage('bot', fallback)
    } finally {
      setThinking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input requires Chrome or Edge')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = true
    recog.onstart  = () => { setListening(true); setTranscript('') }
    recog.onresult = (e) => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(''))
    recog.onerror  = () => setListening(false)
    recog.onend    = async () => {
      setListening(false)
      const t = transcript
      if (t?.trim()) {
        setTranscript('')
        await sendMessage(t.trim())
      } else {
        setTranscript('')
      }
    }
    recogRef.current = recog
    recog.start()
  }

  const stopListening = () => { recogRef.current?.stop(); setListening(false) }

  const BOT_META = {
    ai:          { label: 'AI Assistant', color: 'text-purple-600', bg: 'bg-purple-100' },
    voice:       { label: 'Voice Bot',    color: 'text-blue-600',   bg: 'bg-blue-100'   },
    qbot:        { label: 'QBot',         color: 'text-blue-600',   bg: 'bg-blue-100'   },
    vsupervisor: { label: 'V.Supervisor', color: 'text-emerald-600',bg: 'bg-emerald-100'},
  }

  return (
    <div className="flex h-full gap-0" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* ── Left panel: bot selector + status panels ── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 p-5 border-r border-gray-200 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Bots</p>
          <div className="space-y-2">
            <BotCard icon={<RiRobotLine className="text-lg" />}   name="AI Assistant"     desc="Ask anything — NL to SQL, insights" color="purple" status="online" active={activeBot==='ai'}          onClick={() => setActiveBot('ai')} />
            <BotCard icon={<RiMicLine className="text-lg" />}     name="Voice Bot"        desc="Speak to your infrastructure"       color="blue"   status="online" active={activeBot==='voice'}       onClick={() => setActiveBot('voice')} />
            <BotCard icon={<RiRobot2Line className="text-lg" />}  name="QBot"             desc="Run & view QA test results"         color="blue"   status="online" active={activeBot==='qbot'}        onClick={() => setActiveBot('qbot')} />
            <BotCard icon={<RiBrainLine className="text-lg" />}   name="Virtual Supervisor" desc="Alerts & auto-remediation"        color="emerald" status="online" active={activeBot==='vsupervisor'} onClick={() => setActiveBot('vsupervisor')} />
          </div>
        </div>

        {/* QBot panel */}
        {activeBot === 'qbot' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Runs</p>
              <button onClick={loadRuns} className="text-gray-400 hover:text-gray-600"><RiRefreshLine className={loadingPanel ? 'animate-spin' : ''} /></button>
            </div>
            <div className="space-y-2">
              {runs.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-800 truncate">{r.suite}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-emerald-600"><RiCheckboxCircleLine />{r.passed}</span>
                    <span className="flex items-center gap-1 text-xs text-red-500"><RiCloseCircleLine />{r.failed}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${r.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Virtual Supervisor panel */}
        {activeBot === 'vsupervisor' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Alerts</p>
              <button onClick={loadAlerts} className="text-gray-400 hover:text-gray-600"><RiRefreshLine className={loadingPanel ? 'animate-spin' : ''} /></button>
            </div>
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className={`border rounded-xl p-3 ${a.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-center gap-1.5">
                    <RiAlertLine className={`text-sm ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                    <p className="text-xs font-medium text-gray-800 truncate">{a.rule}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{a.host}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${a.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                </div>
              ))}
              {alerts.length === 0 && !loadingPanel && (
                <div className="text-center py-4 text-xs text-gray-400">
                  <RiShieldCheckLine className="text-2xl text-emerald-400 mx-auto mb-1" />
                  All systems healthy
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation stats */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">Session</p>
          <p className="text-xs text-gray-500 mt-1">{messages.filter(m => m.role === 'user').length} messages sent</p>
          <p className="text-xs text-gray-500">Using: {BOT_META[activeBot]?.label}</p>
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${BOT_META[activeBot]?.bg}`}>
              {activeBot === 'ai'          && <RiRobotLine  className={`text-lg ${BOT_META[activeBot].color}`} />}
              {activeBot === 'voice'       && <RiMicLine    className={`text-lg ${BOT_META[activeBot].color}`} />}
              {activeBot === 'qbot'        && <RiRobot2Line className={`text-lg ${BOT_META[activeBot].color}`} />}
              {activeBot === 'vsupervisor' && <RiBrainLine  className={`text-lg ${BOT_META[activeBot].color}`} />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{BOT_META[activeBot]?.label}</p>
              <p className="text-xs text-gray-400">{thinking ? '🤔 Thinking…' : speaking ? '🔊 Speaking…' : listening ? '🔴 Listening…' : '✅ Ready'}</p>
            </div>
          </div>
          <button onClick={() => setMuted(m => !m)}
            className={`p-2 rounded-lg ${muted ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:bg-gray-100'}`}>
            {muted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' ? BOT_META[msg.bot]?.bg || 'bg-purple-100' : 'bg-indigo-100'}`}>
                {msg.role === 'bot' ? <RiRobotLine className="text-sm text-purple-600" /> : <RiUserLine className="text-sm text-indigo-600" />}
              </div>
              <div className={`max-w-[70%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'bot' ? 'bg-gray-50 text-gray-800 rounded-tl-sm' : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-xs text-gray-400">{msg.ts}</span>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <RiRobotLine className="text-purple-600 text-sm" />
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {listening && transcript && (
            <div className="flex gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <RiUserLine className="text-indigo-600 text-sm" />
              </div>
              <div className="max-w-[70%] items-end flex flex-col gap-1">
                <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-indigo-200 text-indigo-800 italic">{transcript}…</div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick actions for non-AI bots */}
        {(activeBot === 'qbot' || activeBot === 'vsupervisor') && (
          <div className="px-5 py-2 flex gap-2 border-t border-gray-100 flex-shrink-0">
            {activeBot === 'qbot' && (
              <>
                <button onClick={() => sendMessage('Show me all failing test suites')} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Show Failing Tests</button>
                <button onClick={() => sendMessage('Run all test suites now')} className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">Run All Suites</button>
                <button onClick={() => sendMessage('What is the overall test pass rate?')} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100">Pass Rate Summary</button>
              </>
            )}
            {activeBot === 'vsupervisor' && (
              <>
                <button onClick={() => sendMessage('Show all critical alerts')} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Critical Alerts</button>
                <button onClick={() => sendMessage('What was auto-remediated today?')} className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">Auto-Remediated</button>
                <button onClick={() => sendMessage('Show system uptime summary')} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100">Uptime Summary</button>
              </>
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-end gap-3 flex-shrink-0">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${BOT_META[activeBot]?.label} anything…`}
              rows={1}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>
          <button onClick={listening ? stopListening : startListening}
            className={`p-3 rounded-xl flex-shrink-0 transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {listening ? <RiMicOffLine className="text-lg" /> : <RiMicLine className="text-lg" />}
          </button>
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || thinking}
            className="p-3 bg-indigo-600 text-white rounded-xl flex-shrink-0 hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            <RiSendPlaneLine className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  )
}
