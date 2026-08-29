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
  Tag,
  Users,
  Plus,
  Shapes,
  History,
  PiggyBank,
  BarChart3,
  Folder,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { version } from '../../../package.json'
import { authService } from '../../services/authService'
import AccountSwitcher from '../account/AccountSwitcher'
import ChangelogModal from './ChangelogModal'

// Investments is rendered separately below — it expands to list its folders.
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions',  icon: List },
  { id: 'reports',      label: 'Reports',       icon: BarChart3 },
  { id: 'import',       label: 'Import',        icon: Upload },
  { id: 'categories',   label: 'Categories',    icon: Shapes },
  { id: 'activity',     label: 'Activity',      icon: History },
]

export default function Sidebar({
  currentPage,
  activeGroupId,
  onNavigate,
  onSelectGroup,
  groups = [],
  onCreateGroup,
  canCreateGroup = true,
  user,
  profile,
  onSwitchAccount,
  investmentFolders = [],
  activeInvestmentFolderId,
  onSelectInvestmentFolder,
}) {
  const [collapsed, setCollapsed] = useState(false)
  // Expanded by default once folders exist, so they're discoverable.
  const [investmentsOpen, setInvestmentsOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [showChangelog, setShowChangelog] = useState(false)

  const handleSignOut = async () => {
    await authService.signOut()
  }

  const submitNewGroup = async () => {
    const name = newName.trim()
    if (!name) { setAdding(false); return }
    const { data } = await onCreateGroup(name)
    setNewName('')
    setAdding(false)
    if (data) onSelectGroup(data)
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
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
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

        {/* Investments — expands to its folders */}
        <div>
          <div
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${currentPage === 'investments' || currentPage === 'investment-folder'
                ? 'bg-teal-400/10 text-teal-400'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2233]'}
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <button
              onClick={() => onNavigate('investments')}
              title={collapsed ? 'Investments' : undefined}
              className={`flex items-center gap-3 cursor-pointer ${collapsed ? '' : 'flex-1 min-w-0'}`}
            >
              <PiggyBank size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">Investments</span>}
            </button>
            {!collapsed && investmentFolders.length > 0 && (
              <button
                onClick={() => setInvestmentsOpen((o) => !o)}
                aria-label={investmentsOpen ? 'Collapse folders' : 'Expand folders'}
                className="text-gray-600 hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0"
              >
                {investmentsOpen ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
              </button>
            )}
          </div>

          {!collapsed && investmentsOpen && investmentFolders.map((f) => {
            const active = currentPage === 'investment-folder' && activeInvestmentFolderId === f.id
            return (
              <button
                key={f.id}
                onClick={() => onSelectInvestmentFolder(f)}
                title={f.name}
                className={`
                  w-full flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-lg text-sm
                  transition-colors duration-150 cursor-pointer
                  ${active
                    ? 'bg-teal-400/10 text-teal-400'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-[#1f2233]'}
                `}
              >
                <Folder size={14} className="flex-shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            )
          })}
        </div>

        {/* Groups */}
        <div className="pt-4">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Groups</span>
              {canCreateGroup && (
                <button
                  onClick={() => setAdding((a) => !a)}
                  title="New group"
                  className="text-gray-500 hover:text-teal-400 transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          )}

          {adding && !collapsed && (
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewGroup()
                if (e.key === 'Escape') { setNewName(''); setAdding(false) }
              }}
              onBlur={submitNewGroup}
              placeholder="Group name…"
              className="w-full mb-1 px-3 py-1.5 rounded-lg bg-[#1f2233] border border-[#2a2d3a] text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-teal-400/40"
            />
          )}

          {groups.map((g) => {
            const active = currentPage === 'group' && activeGroupId === g.id
            const Icon = g.shared ? Users : Tag
            const title = collapsed
              ? (g.shared ? `${g.name} — shared by ${g.ownerName || g.ownerUsername}` : g.name)
              : (g.shared ? `Shared by ${g.ownerName || g.ownerUsername}` : undefined)
            return (
              <button
                key={g.id}
                onClick={() => onSelectGroup(g)}
                title={title}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                  transition-colors duration-150 cursor-pointer
                  ${active
                    ? 'bg-teal-400/10 text-teal-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f2233]'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{g.name}</span>}
              </button>
            )
          })}

          {collapsed && canCreateGroup && (
            <button
              onClick={() => { setCollapsed(false); setAdding(true) }}
              title="New group"
              className="w-full flex justify-center px-3 py-2 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-[#1f2233] transition-colors cursor-pointer"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2a2d3a] p-2 space-y-1">
        {!collapsed && profile && (
          <AccountSwitcher user={user} profile={profile} onSwitch={onSwitchAccount} />
        )}
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

        {/* Version / changelog */}
        <button
          onClick={() => setShowChangelog(true)}
          title="What's new"
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-600
            hover:text-gray-400 hover:bg-[#1f2233] transition-colors duration-150 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          {collapsed ? <span>v</span> : <span>v{version}</span>}
        </button>
      </div>

      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </aside>
  )
}
