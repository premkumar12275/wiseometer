import { useState, useEffect } from 'react'
import { storageService } from '../../services/storageService'
import SummaryCards from './SummaryCards'
import SpendingChart from './SpendingChart'
import DailyTrend from './DailyTrend'
import MonthlyTrend from './MonthlyTrend'
import RecentTransactions from './RecentTransactions'
import InvestmentsSummaryCard from './InvestmentsSummaryCard'
import GroupBreakdown from './GroupBreakdown'
import TransactionForm from '../transactions/TransactionForm'
import { Plus } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Dashboard({ user, ownerId, canWrite = true, month, year, viewMode = 'month', onNavigate, groups = [], onSelectGroup }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [investmentsSummary, setInvestmentsSummary] = useState(null)
  const [investmentsLoading, setInvestmentsLoading] = useState(true)
  const [groupTotals, setGroupTotals] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  // `silent` updates the figures in place after a save, instead of collapsing
  // the whole dashboard back into skeletons.
  const fetchSummary = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    const { data } = viewMode === 'year'
      ? await storageService.getYearlySummary(ownerId, year)
      : await storageService.getMonthlySummary(ownerId, month, year)
    setSummary(data)
    if (!silent) setLoading(false)
  }

  // A portfolio snapshot isn't scoped to a month/year — fetched independently.
  const fetchInvestmentsSummary = async () => {
    setInvestmentsLoading(true)
    const { data } = await storageService.getInvestmentsSummary(ownerId)
    setInvestmentsSummary(data)
    setInvestmentsLoading(false)
  }

  // Group lifetime totals aren't period-scoped either — one query for all groups.
  const fetchGroupTotals = async () => {
    const { data } = await storageService.getAllGroupTotals(ownerId)
    setGroupTotals(data)
  }

  useEffect(() => {
    fetchSummary()
  }, [ownerId, month, year, viewMode])

  useEffect(() => {
    fetchInvestmentsSummary()
    fetchGroupTotals()
  }, [ownerId])

  const handleSaved = () => {
    setShowForm(false)
    setEditTx(null)
    fetchSummary({ silent: true })
    fetchGroupTotals()
  }

  const periodLabel = viewMode === 'year' ? String(year) : `${MONTHS[month - 1]} ${year}`
  const periodShort = viewMode === 'year' ? String(year) : `${MONTHS[month - 1].slice(0, 3)} ${year}`

  const handleEdit = (tx) => {
    setEditTx(tx)
    setShowForm(true)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overview</h2>
        </div>
        {canWrite && (
          <button onClick={() => { setEditTx(null); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add Transaction
          </button>
        )}
      </div>

      <SummaryCards summary={summary} loading={loading} />

      <GroupBreakdown
        summary={summary}
        groups={groups}
        allTimeTotals={groupTotals}
        periodLabel={periodLabel}
        periodShort={periodShort}
        loading={loading}
        onSelectGroup={onSelectGroup}
      />

      <InvestmentsSummaryCard summary={investmentsSummary} loading={investmentsLoading} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendingChart summary={summary} loading={loading} />
        {viewMode === 'year'
          ? <MonthlyTrend summary={summary} year={year} loading={loading} />
          : <DailyTrend summary={summary} month={month} year={year} loading={loading} />}
      </div>

      <RecentTransactions
        summary={summary}
        loading={loading}
        onNavigate={onNavigate}
        onEdit={canWrite ? handleEdit : undefined}
      />

      {showForm && (
        <TransactionForm
          user={user}
          ownerId={ownerId}
          transaction={editTx}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
    </div>
  )
}
