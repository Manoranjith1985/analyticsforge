import { NavLink } from 'react-router-dom'
import {
  RiDashboardLine,
  RiDatabase2Line,
  RiFileChartLine,
  RiRobotLine,
  RiLineChartLine,
  RiSettings3Line,
} from 'react-icons/ri'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboards',   icon: RiDashboardLine,  label: 'Dashboards' },
  { to: '/datasources',  icon: RiDatabase2Line,  label: 'Data Sources' },
  { to: '/reports',      icon: RiFileChartLine,  label: 'Reports' },
  { to: '/ai',           icon: RiRobotLine,      label: 'AI Assistant' },
  { to: '/analytics',    icon: RiLineChartLine,  label: 'Analytics' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <RiLineChartLine className="text-white text-lg" />
          </div>
          <span className="font-bold text-gray-900 text-base">AnalyticsForge</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="text-xl flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full">
          <RiSettings3Line className="text-xl" />
          Settings
        </button>
      </div>
    </aside>
  )
}
