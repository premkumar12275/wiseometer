import { useState } from 'react'
import {
  LayoutDashboard,
  List,
  Upload,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LogOut,
  User,
} from 'lucide-react'
import { authService } from '../../services/authService'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions',  icon: List },
  { id: 'import',       label: 'Import',        icon: Upload },
]

export default function Sidebar({ currentPage, onNavigate, user }) {
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await authService.signOut()
  }

  return (
    <aside
      className={`
        flex flex-col h-screen bg-[#14171f] border-r border-[#2a2d3a]
        transition-all duration-200 ease-in-out flex-shrink-0
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-[#2a2d3a] ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={18} className="text-teal-400" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-sm whitespace-nowrap">Wiseometer</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 cursor-pointer
                ${active
                  ? 'bg-teal-400/10 text-teal-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2233]'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2a2d3a] p-2 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 truncate">
            <User size={14} className="flex-shrink-0 text-gray-600" />
            <span className="truncate">{user.email}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
            text-gray-500 hover:text-red-400 hover:bg-red-500/10
            transition-colors duration-150 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-600
            hover:text-gray-400 hover:bg-[#1f2233] transition-colors duration-150 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
