import { useState, useEffect, useRef } from 'react'
import {
  RiMicLine, RiMicOffLine, RiVolumeUpLine, RiVolumeMuteLine,
  RiRobotLine, RiUserLine, RiDeleteBinLine, RiDownloadLine,
  RiSettings3Line, RiCloseLine, RiCheckLine,
} from 'react-icons/ri'
import { aiAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── constants ───────────────────────────────────────────────────────────── */
const VOICES_PREF_KEY = 'vb_voice_name'
const WELCOME = 'Hello! I am your Connect Pro Voice Assistant. Ask me anything about your infrastructure, VMs, tickets, or IT operations.'

/* ── helpers ─────────────────────────────────────────────────────────────── */
function speak(text, voiceName, onEnd) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate  = 0.95
  utt.pitch = 1
  if (voiceName) {
    const voices = window.speechSynthesis.getVoices()
    const v = voices.find(v => v.name === voiceName)
    if (v) utt.voice = v
  }
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
  return utt
}

/* ── settings modal ──────────────────────────────────────────────────────── */
function SettingsModal({ selectedVoice, onSelect, onClose }) {
  const [voices, setVoices] = useState([])
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || [])
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Voice Settings</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><RiCloseLine /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">Bot Voice</label>
          {voices.length === 0
            ? <p className="text-sm text-gray-400">No voices available in this browser.</p>
            : voices.filter(v => v.lang.startsWith('en')).map(v => (
              <label key={v.name} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${selectedVoice === v.name ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="voice" checked={selectedVoice === v.name}
                  onChange={() => { onSelect(v.name); localStorage.setItem(VOICES_PREF_KEY, v.name) }}
                  className="accent-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.lang} {v.localService ? '· Local' : '· Remote'}</p>
                </div>
                <button onClick={() => speak('Hello, this is a voice preview.', v.name)}
                  className="ml-auto text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200">
                  Preview
                </button>
              </label>
            ))
          }
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            <RiCheckLine /> Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function VoiceBotPage() {
  const [messages, setMessages]     = useState([
    { role: 'bot', text: WELCOME, ts: new Date().toLocaleTimeString() }
  ])
  const [listening, setListening]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [muted, setMuted]           = useState(false)
  const [thinking, setThinking]     = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceName, setVoiceName]   = useState(localStorage.getItem(VOICES_PREF_KEY) || '')
  const [showSettings, setShowSettings] = useState(false)
  const [supported, setSupported]   = useState(true)

  const recogRef  = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false)
    }
    // welcome speak
    if (!muted) {
      setTimeout(() => speak(WELCOME, voiceName, () => setSpeaking(false)), 800)
      setSpeaking(true)
    }
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text, ts: new Date().toLocaleTimeString() }])
  }

  const sendToAI = async (text) => {
    setThinking(true)
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
      const res = await aiAPI.chat(text, history, null)
      const reply = res.data?.response || res.data?.answer || 'I received your message. How can I assist further?'
      addMessage('bot', reply)
      if (!muted) {
        setSpeaking(true)
        speak(reply, voiceName, () => setSpeaking(false))
      }
    } catch {
      const fallback = `I heard: "${text}". I'm processing your request. Please ensure the AI backend is connected for live responses.`
      addMessage('bot', fallback)
      if (!muted) {
        setSpeaking(true)
        speak(fallback, voiceName, () => setSpeaking(false))
      }
    } finally {
      setThinking(false)
    }
  }

  const startListening = () => {
    if (!supported) { toast.error('Speech recognition not supported in this browser. Try Chrome.'); return }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SpeechRecognition()
    recog.lang = 'en-US'
    recog.continuous = false
    recog.interimResults = true

    recog.onstart  = () => { setListening(true); setTranscript('') }
    recog.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(t)
    }
    recog.onerror  = (e) => { setListening(false); setTranscript(''); toast.error(`Mic error: ${e.error}`) }
    recog.onend    = async () => {
      setListening(false)
      const final = transcript || recogRef.current?.lastTranscript
      if (final?.trim()) {
        addMessage('user', final.trim())
        setTranscript('')
        window.speechSynthesis?.cancel()
        setSpeaking(false)
        await sendToAI(final.trim())
      } else {
        setTranscript('')
      }
    }

    recogRef.current = recog
    recog.start()
  }

  const stopListening = () => {
    recogRef.current?.stop()
    setListening(false)
  }

  const toggleMute = () => {
    setMuted(m => {
      if (!m) { window.speechSynthesis?.cancel(); setSpeaking(false) }
      return !m
    })
  }

  const clearChat = () => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setMessages([{ role: 'bot', text: WELCOME, ts: new Date().toLocaleTimeString() }])
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${listening ? 'bg-red-100' : speaking ? 'bg-emerald-100' : 'bg-purple-100'}`}>
            <RiMicLine className={`text-xl ${listening ? 'text-red-500 animate-pulse' : speaking ? 'text-emerald-600' : 'text-purple-600'}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Voice Bot</h1>
            <p className="text-sm text-gray-500">
              {listening ? '🔴 Listening…' : speaking ? '🔊 Speaking…' : thinking ? '🤔 Thinking…' : '💬 Ready — tap mic to speak'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            className={`p-2 rounded-lg transition-colors ${muted ? 'bg-red-50 text-red-500' : 'text-gray-500 hover:bg-gray-100'}`}>
            {muted ? <RiVolumeMuteLine /> : <RiVolumeUpLine />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <RiSettings3Line />
          </button>
          <button onClick={clearChat} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Clear chat">
            <RiDeleteBinLine />
          </button>
        </div>
      </div>

      {!supported && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex-shrink-0">
          ⚠️ Speech recognition requires <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>. Text input still works.
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-200 p-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' ? 'bg-purple-100' : 'bg-indigo-100'}`}>
              {msg.role === 'bot'
                ? <RiRobotLine className="text-purple-600 text-sm" />
                : <RiUserLine  className="text-indigo-600 text-sm" />
              }
            </div>
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'bot'
                  ? 'bg-gray-50 text-gray-800 rounded-tl-sm'
                  : 'bg-indigo-600 text-white rounded-tr-sm'
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
            <div className="max-w-[75%] items-end flex flex-col gap-1">
              <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-indigo-200 text-indigo-800 italic">
                {transcript}…
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic button */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 pt-2">
        <div className="text-xs text-gray-400 text-center">
          {listening ? 'Tap to stop' : 'Tap to speak'}
        </div>
        <button
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          onClick={listening ? stopListening : startListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            listening
              ? 'bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-200'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'
          }`}
        >
          {listening
            ? <RiMicOffLine className="text-white text-2xl" />
            : <RiMicLine    className="text-white text-2xl" />
          }
        </button>
        <div className="text-xs text-gray-400 text-center">
          {muted ? 'Muted' : 'Sound on'}
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          selectedVoice={voiceName}
          onSelect={setVoiceName}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
