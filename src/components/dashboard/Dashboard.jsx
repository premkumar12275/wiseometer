import { useState, useEffect } from 'react'
import { storageService } from '../../services/storageService'
import SummaryCards from './SummaryCards'
import SpendingChart from './SpendingChart'
import DailyTrend from './DailyTrend'
import RecentTransactions from './RecentTransactions'
import TransactionForm from '../transactions/TransactionForm'
import { Plus } from 'lucide-react'

export default function Dashboard({ user, month, year, onNavigate }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const fetchSummary = async () => {
    setLoading(true)
    const { data } = await storageService.getMonthlySummary(user.id, month, year)
    setSummary(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSummary()
  }, [user.id, month, year])

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
        <button onClick={() => { setEditTx(null); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      <SummaryCards summary={summary} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendingChart summary={summary} loading={loading} />
        <DailyTrend summary={summary} month={month} year={year} loading={loading} />
      </div>

      <RecentTransactions
        summary={summary}
        loading={loading}
        onNavigate={onNavigate}
        onEdit={handleEdit}
      />

      {showForm && (
        <TransactionForm
          user={user}
          transaction={editTx}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}
    </div>
  )
}
