import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  import: 'Import Statement',
}

export default function TopBar({ currentPage, month, year, onMonthChange }) {
  const goBack = () => {
    if (month === 1) onMonthChange(12, year - 1)
    else onMonthChange(month - 1, year)
  }
  const goForward = () => {
    if (month === 12) onMonthChange(1, year + 1)
    else onMonthChange(month + 1, year)
  }

  const now = new Date()
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <header className="h-14 bg-[#14171f] border-b border-[#2a2d3a] flex items-center px-6 gap-4 flex-shrink-0">
      <h1 className="text-base font-semibold text-white flex-1">{PAGE_TITLES[currentPage] || ''}</h1>

      {/* Month picker — only show on dashboard + transactions */}
      {(currentPage === 'dashboard' || currentPage === 'transactions') && (
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-[#1f2233] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-300 w-32 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={goForward}
            disabled={isCurrentMonth}
            className="p-1 rounded-md text-gray-500 hover:text-gray-200 hover:bg-[#1f2233] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={() => onMonthChange(now.getMonth() + 1, now.getFullYear())}
              className="text-xs text-teal-400 hover:text-teal-300 ml-1 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      )}

      <button className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1f2233] transition-colors cursor-pointer">
        <Bell size={16} />
      </button>
    </header>
  )
}
