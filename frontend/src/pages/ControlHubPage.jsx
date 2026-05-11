/**
 * Connect Pro — Unified Control Hub
 * One page to access and operate everything:
 * VESA · QBot · Virtual Supervisor · Voice Bot · Infra tools · AI Chat
 */
import { useState, useRef, useEffect } from 'react'
import {
  RiServerLine, RiRobot2Line, RiBrainLine, RiMicLine, RiMicOffLine,
  RiComputerLine, RiBugLine, RiWifiLine, RiTerminalLine,
  RiRobotLine, RiVolumeUpLine, RiVolumeMuteLine, RiSendPlaneLine,
  RiGridLine, RiArrowLeftSLine, RiArrowRightSLine,
} from 'react-icons/ri'
import { aiAPI } from '../services/api'

// ── lazy-load each tool's content ──────────────────────────────────────────
import VESAPage            from './VESAPage'
import QBotPage            from './QBotPage'
import VirtualSupervisorPage from './VirtualSupervisorPage'
import AssetManagementPage from './AssetManagementPage'
import PatchManagementPage from './PatchManagementPage'
import ProbeManagementPage from './ProbeManagementPage'
import AppServerManagementPage from './AppServerManagementPage'
import InfraAutomationPage from './InfraAutomationPage'
import AIChatPage          from './AIChatPage'

// ── tool registry ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    id: 'vesa', label: 'VESA', desc: 'VM Scheduling & Automation',
    icon: RiServerLine, color: 'violet', component: VESAPage,
  },
  {
    id: 'vsupervisor', label: 'Virtual Supervisor', desc: 'AI Auto-Remediation',
    icon: RiBrainLine, color: 'emerald', component: VirtualSupervisorPage,
  },
  {
    id: 'qbot', label: 'QBot', desc: 'Quality Assurance Bot',
    icon: RiRobot2Line, color: 'blue', component: QBotPage,
  },
  {
    id: 'ai', label: 'AI Assistant', desc: 'Natural Language Analytics',
    icon: RiRobotLine, color: 'purple', component: AIChatPage,
  },
  {
    id: 'assets', label: 'Asset Mgmt', desc: 'Devices & Hardware',
    icon: RiComputerLine, color: 'indigo', component: AssetManagementPage,
  },
  {
    id: 'patches', label: 'Patch Mgmt', desc: 'OS & Software Patches',
    icon: RiBugLine, color: 'amber', component: PatchManagementPage,
  },
  {
    id: 'probes', label: 'Probe Mgmt', desc: 'Network Monitoring',
    icon: RiWifiLine, color: 'cyan', component: ProbeManagementPage,
  },
  {
    id: 'apps', label: 'Apps & Servers', desc: 'Application Servers',
    icon: RiServerLine, color: 'orange', component: AppServerManagementPage,
  },
  {
    id: 'automation', label: 'Infra Automation', desc: 'Rules & Runbooks',
    icon: RiTerminalLine, color: 'rose', component: InfraAutomationPage,
  },
]

const COLOR_MAP = {
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-600',  ring: 'ring-violet-300',  active: 'bg-violet-600'  },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-300', active: 'bg-emerald-600' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-600',    ring: 'ring-blue-300',    active: 'bg-blue-600'    },
  purple:  { bg: 'bg-purple-100',  text: 'text-purple-600',  ring: 'ring-purple-300',  active: 'bg-purple-600'  },
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-600',  ring: 'ring-indigo-300',  active: 'bg-indigo-600'  },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-600',   ring: 'ring-amber-300',   active: 'bg-amber-600'   },
  cyan:    { bg: 'bg-cyan-100',    text: 'text-cyan-600',    ring: 'ring-cyan-300',    active: 'bg-cyan-600'    },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-600',  ring: 'ring-orange-300',  active: 'bg-orange-600'  },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-600',    ring: 'ring-rose-300',    active: 'bg-rose-600'    },
}

// ── voice helpers ──────────────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  const voices = window.speechSynthesis.getVoices()
  const en = voices.find(v => v.lang.startsWith('en'))
  if (en) utt.voice = en
  window.speechSynthesis.speak(utt)
}

// ── persistent voice bar ───────────────────────────────────────────────────
function VoiceBar({ onCommand, activeTool }) {
  const [listening, setListening]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [muted, setMuted]           = useState(false)
  const [text, setText]             = useState('')
  const [transcript, setTranscript] = useState('')
  const [thinking, setThinking]     = useState(false)
  const [reply, setReply]           = useState('')
  const recogRef = useRef()

  const sendText = async (input) => {
    if (!input.trim()) return
    setText('')
    setThinking(true)
    setReply('')
    try {
      const res = await aiAPI.chat(input, [], null)
      const ans = res.data?.response || res.data?.answer || `Understood: "${input}"`
      setReply(ans)
      if (!muted) { setSpeaking(true); speakText(ans); setTimeout(() => setSpeaking(false), ans.length * 55) }
    } catch {
      const fallback = `Command received: "${input}". Connect the AI backend for live responses.`
      setReply(fallback)
      if (!muted) speakText(fallback)
    } finally { setThinking(false) }
  }

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice requires Chrome or Edge'); return }
    const r = new SR(); r.lang = 'en-US'; r.interimResults = true
    r.onstart  = () => { setListening(true); setTranscript('') }
    r.onresult = (e) => setTranscript(Array.from(e.results).map(x => x[0].transcript).join(''))
    r.onend    = () => { setListening(false); if (transcript.trim()) sendText(transcript); setTranscript('') }
    r.onerror  = () => setListening(false)
    recogRef.current = r; r.start()
  }
  const stopListen = () => { recogRef.current?.stop(); setListening(false) }

  return (
    <div className={`border-t border-gray-200 bg-white transition-all ${reply ? 'pb-2' : ''}`}>
      {/* Reply bubble */}
      {reply && (
        <div className="mx-4 mt-2 mb-1 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800 flex items-start gap-2">
          <RiRobotLine className="text-indigo-500 mt-0.5 flex-shrink-0" />
          <span>{reply}</span>
          <button onClick={() => setReply('')} className="ml-auto text-indigo-400 hover:text-indigo-600 text-xs flex-shrink-0">✕</button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${listening ? 'bg-red-500 animate-pulse' : thinking ? 'bg-amber-400 animate-pulse' : speaking ? 'bg-emerald-400' : 'bg-gray-300'}`} />

        {/* Text input */}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendText(text)}
          placeholder={listening ? `Listening… ${transcript}` : `Ask or command any tool — currently on ${activeTool}`}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* Send */}
        <button onClick={() => sendText(text)} disabled={!text.trim() || thinking}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex-shrink-0">
          {thinking
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
            : <RiSendPlaneLine />
          }
        </button>

        {/* Mic */}
        <button
          onClick={listening ? stopListen : startListen}
          className={`p-2 rounded-lg flex-shrink-0 transition-colors ${listening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {listening ? <RiMicOffLine /> : <RiMicLine />}
        </button>

        {/* Mute */}
        <button onClick={() => { setMuted(m => !m); if (!muted) window.speechSynthesis?.cancel() }}
          className={`p-2 rounded-lg flex-shrink-0 ${muted ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-100'}`}>
          {muted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
        </button>
      </div>
    </div>
  )
}

// ── overview dashboard ─────────────────────────────────────────────────────
function Overview({ onSelect }) {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Connect Pro — Control Hub</h2>
        <p className="text-sm text-gray-500 mt-1">All tools in one place. Select a tool below or use the voice bar to command.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {TOOLS.map(tool => {
          const c = COLOR_MAP[tool.color]
          return (
            <button key={tool.id} onClick={() => onSelect(tool.id)}
              className="flex flex-col items-start gap-3 p-5 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} group-hover:ring-2 ${c.ring}`}>
                <tool.icon className={`text-2xl ${c.text}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{tool.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{tool.desc}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>Open →</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── main Control Hub ───────────────────────────────────────────────────────
export default function ControlHubPage() {
  const [activeId, setActiveId]   = useState(null)   // null = overview
  const [navOpen, setNavOpen]     = useState(true)

  const activeTool = TOOLS.find(t => t.id === activeId)
  const ActiveComponent = activeTool?.component

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* ── Top tool rail ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
        {/* Overview button */}
        <button onClick={() => setActiveId(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${activeId === null ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white hover:text-gray-800'}`}>
          <RiGridLine /> Overview
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1 flex-shrink-0" />

        {TOOLS.map(tool => {
          const c = COLOR_MAP[tool.color]
          const isActive = activeId === tool.id
          return (
            <button key={tool.id} onClick={() => setActiveId(tool.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${isActive ? `${c.active} text-white shadow-sm` : `text-gray-600 hover:bg-white hover:text-gray-900`}`}>
              <tool.icon className="text-sm" />
              {tool.label}
            </button>
          )
        })}
      </div>

      {/* ── Tool content area ── */}
      <div className="flex-1 overflow-hidden min-h-0 bg-gray-50">
        {activeId === null
          ? <Overview onSelect={setActiveId} />
          : ActiveComponent
            ? <div className="h-full overflow-y-auto"><ActiveComponent /></div>
            : <div className="flex items-center justify-center h-full text-gray-400">Tool not found</div>
        }
      </div>

      {/* ── Persistent Voice + Command Bar ── */}
      <VoiceBar
        activeTool={activeTool?.label || 'Overview'}
        onCommand={(cmd) => console.log('command:', cmd)}
      />
    </div>
  )
}
