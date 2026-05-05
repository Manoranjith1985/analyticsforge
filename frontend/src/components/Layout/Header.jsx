import { useNavigate } from 'react-router-dom'
import { RiLogoutBoxLine, RiEarthLine } from 'react-icons/ri'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Header() {
  const { user, logout, setLanguage } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const toggleLanguage = async () => {
    const newLang = user?.preferred_language === 'ta' ? 'en' : 'ta'
    await setLanguage(newLang)
    toast.success(`Language switched to ${newLang === 'ta' ? 'Tamil' : 'English'}`)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5"
          title="Toggle language"
        >
          <RiEarthLine />
          {user?.preferred_language === 'ta' ? 'தமிழ்' : 'EN'}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">{user?.full_name}</p>
            <p className="text-gray-500 text-xs capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <RiLogoutBoxLine className="text-xl" />
        </button>
      </div>
    </header>
  )
}
