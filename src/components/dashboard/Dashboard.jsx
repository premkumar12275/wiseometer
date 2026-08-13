import { useState, useEffect } from 'react'
import { storageService } from '../../services/storageService'
import SummaryCards from './SummaryCards'
import SpendingChart from './SpendingChart'
import DailyTrend from './DailyTrend'
import MonthlyTrend from './MonthlyTrend'
import RecentTransactions from './RecentTransactions'
import InvestmentsSummaryCard from './InvestmentsSummaryCard'
import TransactionForm from '../transactions/TransactionForm'
import { Plus } from 'lucide-react'

export default function Dashboard({ user, ownerId, canWrite = true, month, year, viewMode = 'month', onNavigate }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [investmentsSummary, setInvestmentsSummary] = useState(null)
  const [investmentsLoading, setInvestmentsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const fetchSummary = async () => {
    setLoading(true)
    const { data } = viewMode === 'year'
      ? await storageService.getYearlySummary(ownerId, year)
      : await storageService.getMonthlySummary(ownerId, month, year)
    setSummary(data)
    setLoading(false)
  }

  // A portfolio snapshot isn't scoped to a month/year — fetched independently.
  const fetchInvestmentsSummary = async () => {
    setInvestmentsLoading(true)
    const { data } = await storageService.getInvestmentsSummary(ownerId)
    setInvestmentsSummary(data)
    setInvestmentsLoading(false)
  }

  useEffect(() => {
    fetchSummary()
  }, [ownerId, month, year, viewMode])

  useEffect(() => {
    fetchInvestmentsSummary()
  }, [ownerId])

  const handleSaved = () => {
    setShowForm(false)
    setEditTx(null)
    fetchSummary()
  }

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
