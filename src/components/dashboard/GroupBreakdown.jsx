import { formatCurrency } from '../../utils/format'
import { Tag, ChevronRight } from 'lucide-react'

// Grouped spending is kept out of the headline totals and surfaced here
// instead, one row per group. Each row shows the selected period's spend with
// the group's all-time total underneath, since a group (a trip, a renovation)
// usually spans more months than the dashboard is showing.
export default function GroupBreakdown({ summary, groups = [], allTimeTotals, periodLabel, loading, onSelectGroup }) {
  // Nothing to skeleton for an account that has no groups at all.
  if (loading) {
    if (groups.length === 0) return null
    return (
      <div className="card p-5 space-y-3">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-10 w-full rounded" />
        <div className="skeleton h-10 w-full rounded" />
      </div>
    )
  }

  const rows = (summary?.groups || [])
    .map((g) => ({ ...g, group: groups.find((x) => x.id === g.groupId) }))
    .filter((g) => g.group)

  if (rows.length === 0) return null

  const periodTotal = rows.reduce((sum, g) => sum + g.expense, 0)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Tag size={13} className="text-teal-400" />
          Group spending
        </h3>
        <p className="text-xs text-gray-500">
          {periodLabel} · <span className="amount-font text-red-400">{formatCurrency(periodTotal)}</span>
        </p>
      </div>

      <div className="space-y-1">
        {rows.map(({ groupId, group, count, expense, income, transfer }) => {
          const allTime = allTimeTotals?.[groupId]
          return (
            <button
              key={groupId}
              onClick={() => onSelectGroup?.(group)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1f2233] transition-colors cursor-pointer text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-400/10 flex items-center justify-center flex-shrink-0">
                <Tag size={15} className="text-teal-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 font-medium truncate">{group.name}</p>
                <p className="text-xs text-gray-500">
                  {count} transaction{count !== 1 ? 's' : ''} {periodLabel.toLowerCase()}
                  {income > 0 && <> · In <span className="text-green-400 amount-font">{formatCurrency(income)}</span></>}
                  {transfer > 0 && <> · Transfers <span className="text-slate-400 amount-font">{formatCurrency(transfer)}</span></>}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="amount-font text-sm font-semibold text-red-400">{formatCurrency(expense)}</p>
                {allTime && (
                  <p className="text-[11px] text-gray-600 amount-font">
                    {formatCurrency(allTime.expense)} all-time
                  </p>
                )}
              </div>

              <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-600 mt-3 pt-3 border-t border-[#2a2d3a]">
        Group spending is excluded from the totals and charts above.
      </p>
    </div>
  )
}
