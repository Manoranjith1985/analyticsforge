import { NavLink, useNavigate } from 'react-router-dom'
import {
  RiDashboardLine, RiDatabase2Line, RiFileChartLine, RiRobotLine,
  RiLineChartLine, RiSettings3Line, RiSlideshowLine,
  RiShieldLine, RiTimeLine, RiCodeLine, RiLogoutBoxLine,
  RiGitMergeLine, RiCpuLine, RiComputerLine, RiBugLine,
  RiWifiLine, RiServerLine, RiTerminalLine,
  RiBrainLine, RiRobot2Line, RiMicLine, RiGroupLine,
} from 'react-icons/ri'
import clsx from 'clsx'
import useAuthStore from '../../store/authStore'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/dashboards',  icon: RiDashboardLine, label: 'Dashboards' },
      { to: '/datasources', icon: RiDatabase2Line, label: 'Data Sources' },
      { to: '/reports',     icon: RiFileChartLine, label: 'Reports' },
      { to: '/analytics',   icon: RiLineChartLine, label: 'Analytics' },
    ],
  },
  {
    label: 'AI & ML',
    items: [
      { to: '/ai',     icon: RiRobotLine, label: 'AI Assistant' },
      { to: '/automl', icon: RiCpuLine,   label: 'AutoML' },
    ],
  },
  {
    label: 'Build',
    items: [
      { to: '/pipelines', icon: RiGitMergeLine, label: 'Pipelines' },
      { to: '/stories',   icon: RiSlideshowLine, label: 'Data Stories' },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { to: '/scheduled-reports', icon: RiTimeLine, label: 'Scheduled Reports' },
      { to: '/embed',             icon: RiCodeLine, label: 'Embed & API' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { to: '/infra/assets',     icon: RiComputerLine, label: 'Asset Management' },
      { to: '/infra/patches',    icon: RiBugLine,      label: 'Patch Management' },
      { to: '/infra/probes',     icon: RiWifiLine,     label: 'Probe Management' },
      { to: '/infra/apps',       icon: RiServerLine,   label: 'Apps & Servers' },
      { to: '/infra/automation', icon: RiTerminalLine, label: 'Infra Automation' },
    ],
  },
  {
    label: 'Connect Pro',
    items: [
      { to: '/vesa',               icon: RiServerLine,   label: 'VESA'               },
      { to: '/virtual-supervisor', icon: RiBrainLine,    label: 'Virtual Supervisor'  },
      { to: '/qbot',               icon: RiRobot2Line,   label: 'QBot'               },
      { to: '/voice-bot',          icon: RiMicLine,      label: 'Voice Bot'           },
      { to: '/bot-hub',            icon: RiGroupLine,    label: 'Bot Hub'             },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/admin', icon: RiShieldLine, label: 'Admin Panel' },
    ],
  },
]

export default function Sidebar() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <RiLineChartLine className="text-white text-lg" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm block">Connect Pro</span>
            <span className="text-xs text-gray-400">IT Service Automation</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <Icon className="text-lg flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">
              {user.full_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors">
          <RiLogoutBoxLine className="text-lg" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
