import { getCategoryById } from '../../constants/categories'
import { formatCurrency } from '../../utils/format'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Receipt } from 'lucide-react'

function TransactionRow({ tx, onEdit }) {
  const cat = getCategoryById(tx.category)
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  const amountColor = isTransfer ? 'text-slate-400' : isIncome ? 'text-green-400' : 'text-red-400'
  const AmountIcon = isTransfer ? ArrowLeftRight : isIncome ? ArrowUpRight : ArrowDownRight
  const fmt = formatCurrency

  return (
    <button
      onClick={() => onEdit && onEdit(tx)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1f2233] transition-colors cursor-pointer rounded-lg text-left"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
        style={{ backgroundColor: cat.color + '22' }}
      >
        {cat.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">
          {tx.description || 'No description'}
        </p>
        <p className="text-xs text-gray-500">{tx.date}</p>
      </div>

      <div className={`flex items-center gap-1 amount-font text-sm font-semibold ${amountColor}`}>
        <AmountIcon size={14} />
        {fmt(tx.amount)}
      </div>
    </button>
  )
}

export default function RecentTransactions({ summary, loading, onNavigate, onEdit }) {
  const transactions = summary?.transactions?.slice(-10).reverse() || []

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Recent Transactions</h2>
        <button
          onClick={() => onNavigate('transactions')}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
        >
          View all →
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-1">
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-2.5 w-1/3 rounded" />
              </div>
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-600">
          <Receipt size={32} strokeWidth={1} className="mb-2 opacity-40" />
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs text-gray-700 mt-1">Add one to get started</p>
        </div>
      ) : (
        <div className="-mx-1">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
