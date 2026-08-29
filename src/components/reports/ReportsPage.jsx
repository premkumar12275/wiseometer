import { useState, useEffect, useMemo } from 'react'
import { storageService } from '../../services/storageService'
import { useCategories } from '../../contexts/CategoriesContext'
import PeriodSummary from '../common/PeriodSummary'
import CategoryTagChart from './CategoryTagChart'
import { buildCategoryTagData } from './buildCategoryTagData'
import { Tag, CalendarRange } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// Totals in the shape PeriodSummary expects, derived from the rows on screen.
function totalsFrom(rows, { countGrouped }) {
  const sumType = (t) =>
    rows.filter((r) => r.type === t).reduce((s, r) => s + parseFloat(r.amount), 0)
  const income = sumType('income')
  const expenses = sumType('expense')
  const grouped = countGrouped ? rows.filter((r) => r.group_id) : []

  return {
    count: rows.length,
    income,
    expenses,
    transfers: sumType('transfer'),
    net: income - expenses,
    groupedCount: grouped.length,
    groupedExpenses: grouped
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + parseFloat(r.amount), 0),
  }
}

export default function ReportsPage({ ownerId, month, year, viewMode = 'month', groups = [] }) {
  const { getCategoryById } = useCategories()
  const [scope, setScope] = useState('period') // 'period' or a group id
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const group = scope === 'period' ? null : groups.find((g) => g.id === scope)

  // A group that disappears (deleted, or un-shared) falls back to the period.
  useEffect(() => {
    if (scope !== 'period' && !group) setScope('period')
  }, [scope, group])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      // A group report is all-time, matching the group view; the period report
      // follows the month/year picker in the top bar.
      const { data } = await storageService.getAllFilteredTransactions(
        group
          ? { userId: ownerId, groupId: group.id }
          : { userId: ownerId, month, year, viewMode }
      )
      if (cancelled) return
      setRows(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [ownerId, month, year, viewMode, group])

  const chart = useMemo(
    () => buildCategoryTagData(rows, getCategoryById),
    [rows, getCategoryById]
  )

  const totals = useMemo(
    () => totalsFrom(rows, { countGrouped: !group }),
    [rows, group]
  )

  const periodLabel = group
    ? `${group.name} · all time`
    : viewMode === 'year' ? String(year) : `${MONTHS[month - 1]} ${year}`

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Report scope</h2>
          <p className="text-sm text-gray-300 mt-0.5 flex items-center gap-1.5">
            {group ? <Tag size={14} className="text-teal-400" /> : <CalendarRange size={14} className="text-teal-400" />}
            {periodLabel}
          </p>
        </div>

        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="input-field w-auto min-w-[200px] cursor-pointer"
        >
          <option value="period">
            {viewMode === 'year' ? year : `${MONTHS[month - 1]} ${year}`} — all transactions
          </option>
          {groups.length > 0 && (
            <optgroup label="Groups (all time)">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      <PeriodSummary totals={totals} periodLabel={periodLabel} loading={loading} />

      <CategoryTagChart
        data={chart.data}
        series={chart.series}
        seriesColor={chart.seriesColor}
        foldedCount={chart.foldedCount}
        loading={loading}
      />
    </div>
  )
}
