import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiAddLine, RiDeleteBinLine, RiShareLine, RiSlideshowLine, RiImageLine } from 'react-icons/ri'
import { storiesAPI, datasourceAPI } from '../services/api'
import toast from 'react-hot-toast'

const THEMES = ['light','dark','corporate','vibrant']

export default function StoriesPage() {
  const [stories, setStories] = useState([])
  const [datasources, setDatasources] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', theme: 'light' })
  const [slideForm, setSlideForm] = useState({ title: '', content: '', chart_type: 'bar', datasource_id: '', query: '', slide_order: 1 })
  const navigate = useNavigate()

  useEffect(() => {
    storiesAPI.list().then(r => setStories(r.data)).catch(() => {})
    datasourceAPI.list().then(r => setDatasources(r.data)).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const { data } = await storiesAPI.create(form)
      setStories(s => [data, ...s])
      setShowCreate(false)
      setForm({ title: '', description: '', theme: 'light' })
      toast.success('Story created!')
    } catch { toast.error('Error creating story') }
  }

  const handleDelete = async (id) => {
    await storiesAPI.delete(id)
    setStories(s => s.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Deleted')
  }

  const handleShare = async (id) => {
    try {
      const { data } = await storiesAPI.share(id)
      if (data.share_token) {
        const url = `${window.location.origin}/embed/story/${data.share_token}`
        navigator.clipboard.writeText(url)
        toast.success('Share link copied!')
      }
    } catch { toast.error('Share failed') }
  }

  const handleAddSlide = async (e) => {
    e.preventDefault()
    if (!selected) return
    try {
      const { data } = await storiesAPI.addSlide(selected.id, slideForm)
      setSelected(s => ({ ...s, slides: [...(s.slides || []), data] }))
      setSlideForm({ title: '', content: '', chart_type: 'bar', datasource_id: '', query: '', slide_order: (selected.slides?.length || 0) + 2 })
      toast.success('Slide added!')
    } catch { toast.error('Error adding slide') }
  }

  const handleDeleteSlide = async (slideId) => {
    if (!selected) return
    await storiesAPI.deleteSlide(selected.id, slideId)
    setSelected(s => ({ ...s, slides: s.slides.filter(sl => sl.id !== slideId) }))
    toast.success('Slide removed')
  }

  const openStory = async (story) => {
    try {
      const { data } = await storiesAPI.get(story.id)
      setSelected(data)
    } catch { toast.error('Failed to load story') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Stories</h1>
          <p className="text-gray-500 text-sm mt-1">Create narrative presentations from your data</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <RiAddLine /> New Story
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stories.length === 0 && !selected && (
          <div className="col-span-3 text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <RiSlideshowLine className="text-5xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No stories yet. Create your first data story.</p>
          </div>
        )}
        {stories.map(story => (
          <div key={story.id} onClick={() => openStory(story)}
            className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${selected?.id === story.id ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${story.theme === 'dark' ? 'bg-gray-800 text-white' : story.theme === 'vibrant' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{story.theme}</span>
                </div>
                <h3 className="font-semibold text-gray-800">{story.title}</h3>
                {story.description && <p className="text-xs text-gray-500 mt-0.5">{story.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{story.slides?.length || 0} slides</p>
              </div>
              <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleShare(story.id)} className="text-gray-400 hover:text-indigo-600 p-1" title="Share"><RiShareLine /></button>
                <button onClick={() => handleDelete(story.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><RiDeleteBinLine /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Story Detail */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{selected.title} — Slides</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-sm">Close</button>
          </div>

          {/* Slides list */}
          <div className="space-y-3">
            {(selected.slides || []).sort((a,b) => a.slide_order - b.slide_order).map((slide, i) => (
              <div key={slide.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">{i + 1}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-700 text-sm">{slide.title}</p>
                  {slide.content && <p className="text-xs text-gray-500 mt-0.5">{slide.content}</p>}
                  <p className="text-xs text-gray-400 mt-1">Chart: {slide.chart_type}</p>
                </div>
                <button onClick={() => handleDeleteSlide(slide.id)} className="text-gray-400 hover:text-red-500"><RiDeleteBinLine /></button>
              </div>
            ))}
          </div>

          {/* Add slide form */}
          <form onSubmit={handleAddSlide} className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
            <h3 className="font-semibold text-indigo-700 text-sm">Add Slide</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Slide Title</label>
                <input className="input text-sm py-1.5" value={slideForm.title} onChange={e => setSlideForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs">Chart Type</label>
                <select className="input text-sm py-1.5" value={slideForm.chart_type} onChange={e => setSlideForm(f => ({ ...f, chart_type: e.target.value }))}>
                  {['bar','line','area','pie','donut','scatter','kpi','table'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Narrative Content</label>
              <textarea className="input text-sm resize-none" rows={2} value={slideForm.content} onChange={e => setSlideForm(f => ({ ...f, content: e.target.value }))} placeholder="Tell the story behind this data…" />
            </div>
            <div>
              <label className="label text-xs">Data Source</label>
              <select className="input text-sm py-1.5" value={slideForm.datasource_id} onChange={e => setSlideForm(f => ({ ...f, datasource_id: e.target.value }))}>
                <option value="">— None —</option>
                {datasources.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
              </select>
            </div>
            {slideForm.datasource_id && (
              <div>
                <label className="label text-xs">SQL Query</label>
                <textarea className="input text-sm font-mono resize-none" rows={2} value={slideForm.query} onChange={e => setSlideForm(f => ({ ...f, query: e.target.value }))} />
              </div>
            )}
            <button type="submit" className="btn-primary text-sm w-full flex items-center justify-center gap-2">
              <RiImageLine /> Add Slide
            </button>
          </form>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">New Data Story</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Theme</label>
                <div className="flex gap-2">
                  {THEMES.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, theme: t }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${form.theme === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Story</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
