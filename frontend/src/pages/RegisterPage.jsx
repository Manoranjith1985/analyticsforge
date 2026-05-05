import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RiLineChartLine } from 'react-icons/ri'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const { register, isLoading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await register(form)
    if (result.success) {
      toast.success('Account created! Please sign in.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4">
            <RiLineChartLine className="text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AnalyticsForge</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>
          {error && <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input name="full_name" type="text" className="input" placeholder="John Smith"
                value={form.full_name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="you@company.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" className="input" placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange} required minLength={8} />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
