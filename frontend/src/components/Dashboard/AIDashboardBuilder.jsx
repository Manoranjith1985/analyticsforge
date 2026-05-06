import { useState } from 'react'
import {
  RiSparklingLine, RiCloseLine, RiArrowRightLine, RiArrowLeftLine,
  RiCheckDoubleLine, RiEdit2Line, RiBarChartLine,
  RiLineChartLine, RiPieChartLine, RiDashboardLine, RiTableLine,
  RiBarChart2Line, RiFireLine, RiFilterLine,
  RiRocketLine, RiRefreshLine, RiLightbulbLine, RiAddLine,
  RiHashtag, RiCheckLine
} from 'react-icons/ri'
import { aiAPI, dashboardAPI } from '../../services/api'
import toast from 'react-hot-toast'

// ── Chart type visual map ─────────────────────────────────────────────────────
const CHART_META = {
  bar:     { icon: RiBarChartLine,   color: 'bg-indigo-100 text-indigo-600',  label: 'Bar Chart'    },
  line:    { icon: RiLineChartLine,  color: 'bg-blue-100 text-blue-600',      label: 'Line Chart'   },
  area:    { icon: RiLineChartLine,  color: 'bg-cyan-100 text-cyan-600',      label: 'Area Chart'   },
  pie:     { icon: RiPieChartLine,   color: 'bg-purple-100 text-purple-600',  label: 'Pie Chart'    },
  donut:   { icon: RiPieChartLine,   color: 'bg-pink-100 text-pink-600',      label: 'Donut Chart'  },
  scatter: { icon: RiBarChart2Line,  color: 'bg-orange-100 text-orange-600',  label: 'Scatter Plot' },
  heatmap: { icon: RiFireLine,       color: 'bg-red-100 text-red-600',        label: 'Heatmap'      },
  kpi:     { icon: RiHashtag,        color: 'bg-emerald-100 text-emerald-600',label: 'KPI Card'     },
  table:   { icon: RiTableLine,      color: 'bg-gray-100 text-gray-600',      label: 'Data Table'   },
  funnel:  { icon: RiFilterLine,     color: 'bg-yellow-100 text-yellow-600',  label: 'Funnel Chart' },
}

const getChartMeta = (type) => CHART_META[type] || CHART_META.bar

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Requirements', 'Preview', 'Approve & Deploy']

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i < current  ? 'bg-indigo-600 text-white' :
                i === current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                                'bg-gray-100 text-gray-400'}`}>
              {i < current ? <RiCheckDoubleLine /> : i + 1}
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${i === current ? 'text-indigo-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 mb-4 transition-all ${i < current ? 'bg-indigo-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Widget Preview Card ───────────────────────────────────────────────────────
function WidgetPreviewCard({ widget, index }) {
  const meta = getChartMeta(widget.chart_type)
  const Icon = meta.icon
  const isKpi = widget.chart_type === 'kpi'

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow
      ${isKpi ? 'col-span-1' : 'col-span-2'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <Icon className="text-sm" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{widget.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
              {meta.label}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{index + 1}</span>
      </div>

      {/* Animated chart preview placeholder */}
      <div className={`rounded-lg overflow-hidden mb-3 ${isKpi ? 'h-14' : 'h-28'} flex items-center justify-center
        bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100`}>
        {isKpi ? (
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">—</div>
            <div className="text-xs text-gray-400">Awaiting data</div>
          </div>
        ) : (
          <div className="w-full px-4 flex items-end justify-around h-full py-3 gap-1">
            {[60, 85, 45, 72, 90, 55, 78].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm opacity-30"
                style={{ height: `${h}%`, background: 'linear-gradient(to top, #6366f1, #8b5cf6)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed">{widget.description}</p>

      {/* Query badge */}
      {widget.query && (
        <details className="mt-2">
          <summary className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-700 font-medium">
            View suggested query
          </summary>
          <pre className="mt-1.5 text-xs bg-gray-900 text-green-400 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {widget.query}
          </pre>
        </details>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIDashboardBuilder({ onClose, onDeployed }) {
  const [step, setStep]               = useState(0)        // 0=req, 1=preview, 2=approve
  const [requirements, setRequirements] = useState('')
  const [config, setConfig]           = useState(null)
  const [feedback, setFeedback]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [revisions, setRevisions]     = useState(0)
  const [deploying, setDeploying]     = useState(false)

  // ── Example prompts ─────────────────────────────────────────────────────
  const EXAMPLES = [
    'Sales performance dashboard with monthly revenue trends, top products, regional breakdown, and customer acquisition funnel',
    'HR analytics dashboard showing headcount by department, attrition rate, hiring pipeline, and employee satisfaction scores',
    'E-commerce KPIs: total orders, conversion rate, average order value, cart abandonment, and revenue by category',
    'Marketing campaign dashboard with impressions, clicks, CTR, cost per lead, and channel performance comparison',
  ]

  // ── Step 1: Generate ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!requirements.trim()) { toast.error('Please describe what you want'); return }
    setLoading(true)
    setLoadingMsg('Analysing your requirements…')
    try {
      setTimeout(() => setLoadingMsg('Designing widget layout…'), 1500)
      setTimeout(() => setLoadingMsg('Writing SQL queries…'), 3000)
      setTimeout(() => setLoadingMsg('Finalising dashboard config…'), 5000)
      const { data } = await aiAPI.generateDashboard(requirements)
      setConfig(data.config)
      setStep(1)
      toast.success('Dashboard generated!')
    } catch (err) {
      toast.error('Generation failed. Check that an AI API key is configured.')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  // ── Step 2 → revise ───────────────────────────────────────────────────────
  const handleRefine = async () => {
    if (!feedback.trim()) { toast.error('Please describe what to change'); return }
    setLoading(true)
    setLoadingMsg('Applying your changes…')
    try {
      const { data } = await aiAPI.refineDashboard(config, feedback)
      setConfig(data.config)
      setFeedback('')
      setRevisions(r => r + 1)
      toast.success('Dashboard updated!')
    } catch {
      toast.error('Refinement failed. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  // ── Step 3: Deploy ────────────────────────────────────────────────────────
  const handleDeploy = async () => {
    setDeploying(true)
    try {
      // 1. Create the dashboard
      const { data: dashboard } = await dashboardAPI.create({
        name: config.name,
        description: config.description || '',
        theme: config.theme || 'light',
      })

      // 2. Add all widgets
      const widgetPromises = (config.widgets || []).map(w =>
        dashboardAPI.addWidget(dashboard.id, {
          title:        w.title,
          chart_type:   w.chart_type,
          query:        w.query || '',
          config:       w.config || {},
          position_x:   w.position_x ?? 0,
          position_y:   w.position_y ?? 0,
          width:        w.width  ?? 6,
          height:       w.height ?? 4,
        })
      )
      await Promise.all(widgetPromises)

      toast.success(`"${config.name}" deployed successfully!`)
      setStep(2)
      if (onDeployed) onDeployed(dashboard)
    } catch (err) {
      toast.error('Deployment failed. Please try again.')
    } finally {
      setDeploying(false)
    }
  }

  // ── Loading overlay ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-5 max-w-sm mx-4 w-full">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <RiSparklingLine className="absolute inset-0 m-auto text-indigo-600 text-2xl" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900 text-lg">AI is working…</p>
          <p className="text-gray-500 text-sm mt-1 transition-all">{loadingMsg}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <RiSparklingLine className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Dashboard Builder</h2>
              <p className="text-xs text-gray-400">Powered by Claude AI</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <RiCloseLine className="text-xl" />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StepBar current={step} />

          {/* ════ STEP 0: Requirements ════ */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Describe your dashboard
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Tell the AI what business area, KPIs, and chart types you need.
                  The more detail you give, the better the output.
                </p>
                <textarea
                  rows={5}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none
                    placeholder:text-gray-300"
                  placeholder="e.g. Sales dashboard showing monthly revenue trends, top 10 products by sales, regional performance map, customer acquisition funnel, and daily order KPIs"
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">{requirements.length} characters</span>
                  <span className="text-xs text-gray-400">Tip: mention chart types and metrics</span>
                </div>
              </div>

              {/* Example prompts */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <RiLightbulbLine className="text-yellow-500" /> Try an example
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} onClick={() => setRequirements(ex)}
                      className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700
                        border border-gray-200 hover:border-indigo-300 rounded-xl px-3 py-2.5 transition-all leading-relaxed">
                      {ex.length > 90 ? ex.slice(0, 90) + '…' : ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 1: Preview & Refine ════ */}
          {step === 1 && config && (
            <div className="space-y-5">
              {/* Dashboard summary card */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <RiDashboardLine className="text-indigo-600 text-2xl flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{config.name}</h3>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{config.description}</p>
                    )}
                    {config.ai_summary && (
                      <p className="text-xs text-indigo-700 mt-2 bg-indigo-100/60 rounded-lg px-3 py-1.5 leading-relaxed">
                        💡 {config.ai_summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        {config.widgets?.length || 0} widgets
                      </span>
                      {revisions > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          {revisions} revision{revisions > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget grid preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Widget Preview
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {(config.widgets || []).map((w, i) => (
                    <WidgetPreviewCard key={i} widget={w} index={i} />
                  ))}
                </div>
              </div>

              {/* Request changes box */}
              <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <RiEdit2Line className="text-indigo-500" />
                  Request Changes
                </p>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                    placeholder="e.g. Add a pie chart for product categories, change the bar chart to a line chart, rename the Revenue KPI to Total Sales…"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                  <button
                    onClick={handleRefine}
                    disabled={!feedback.trim()}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white
                      rounded-xl font-medium text-sm flex items-center gap-1.5 transition-colors self-end h-10"
                  >
                    <RiRefreshLine /> Revise
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 2: Deployed ════ */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                <RiRocketLine className="text-green-600 text-4xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Dashboard Deployed!</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                <strong>{config?.name}</strong> has been created with {config?.widgets?.length} widgets
                and is ready to use.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Connect a data source to your widgets to see live data.
              </p>
              <button onClick={onClose}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                Open Dashboard →
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step < 2 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => step === 0 ? onClose() : setStep(0)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RiArrowLeftLine />
              {step === 0 ? 'Cancel' : 'Back to Requirements'}
            </button>

            <div className="flex items-center gap-3">
              {step === 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={!requirements.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600
                    hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white
                    px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
                >
                  <RiSparklingLine />
                  Generate Dashboard
                  <RiArrowRightLine />
                </button>
              )}

              {step === 1 && (
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700
                    disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all"
                >
                  {deploying ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deploying…</>
                  ) : (
                    <><RiCheckDoubleLine /> Approve & Deploy</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
