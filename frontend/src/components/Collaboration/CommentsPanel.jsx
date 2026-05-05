import { useState, useEffect, useRef } from 'react'
import { RiCloseLine, RiSendPlanLine, RiCheckLine, RiDeleteBinLine } from 'react-icons/ri'
import { collaborationAPI } from '../../services/api'
import { format } from 'date-fns'

export default function CommentsPanel({ dashboardId, onClose }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  const fetchComments = async () => {
    try {
      const { data } = await collaborationAPI.getComments(dashboardId)
      setComments(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchComments() }, [dashboardId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    try {
      const { data } = await collaborationAPI.addComment(dashboardId, { content: text.trim() })
      setComments(c => [...c, data])
      setText('')
    } catch {}
  }

  const handleResolve = async (commentId) => {
    try {
      await collaborationAPI.resolveComment(commentId)
      setComments(c => c.map(cm => cm.id === commentId ? { ...cm, is_resolved: true } : cm))
    } catch {}
  }

  const handleDelete = async (commentId) => {
    try {
      await collaborationAPI.deleteComment(commentId)
      setComments(c => c.filter(cm => cm.id !== commentId))
    } catch {}
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col h-full max-h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Comments</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><RiCloseLine className="text-lg" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Loading…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-center text-gray-300 text-sm py-8">No comments yet.<br />Start the conversation!</p>
        )}
        {comments.map(comment => (
          <div key={comment.id} className={`rounded-lg p-3 text-sm ${comment.is_resolved ? 'bg-green-50 border border-green-100 opacity-70' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-gray-700 text-xs mb-1">
                  {comment.author_name || 'User'}
                  {comment.is_resolved && <span className="ml-2 text-green-600 text-xs">✓ Resolved</span>}
                </p>
                <p className="text-gray-600 break-words">{comment.content}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {comment.created_at ? format(new Date(comment.created_at), 'MMM d, h:mm a') : ''}
                </p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!comment.is_resolved && (
                  <button onClick={() => handleResolve(comment.id)} title="Resolve" className="text-gray-400 hover:text-green-600 p-0.5">
                    <RiCheckLine className="text-sm" />
                  </button>
                )}
                <button onClick={() => handleDelete(comment.id)} title="Delete" className="text-gray-400 hover:text-red-500 p-0.5">
                  <RiDeleteBinLine className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Add a comment…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit" disabled={!text.trim()} className="btn-primary px-3 py-2 disabled:opacity-50">
          <RiSendPlanLine />
        </button>
      </form>
    </div>
  )
}
