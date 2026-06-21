import { useState, useEffect } from 'react'
import { CATEGORIES } from '../../constants/categories'
import { storageService } from '../../services/storageService'
import { X } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  date: today(),
  description: '',
  amount: '',
  type: 'expense',
  category: 'other',
  account: 'Main',
}

export default function TransactionForm({ user, transaction, onSaved, onClose }) {
  const [form, setForm] = useState(transaction ? {
    date: transaction.date,
    description: transaction.description || '',
    amount: String(transaction.amount),
    type: transaction.type,
    category: transaction.category,
    account: transaction.account || 'Main',
  } : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    setLoading(true)

    const payload = {
      user_id: user.id,
      date: form.date,
      description: form.description.trim() || null,
      amount,
      type: form.type,
      category: form.category,
      account: form.account || 'Main',
    }

    let result
    if (transaction) {
      result = await storageService.updateTransaction(transaction.id, payload)
    } else {
      result = await storageService.saveTransaction({ ...payload, source: 'manual' })
    }

    if (result.error) setError(result.error.message)
    else onSaved()
    setLoading(false)
  }

  // Trap focus inside modal
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[#2a2d3a]">
            {['expense', 'income', 'transfer'].map((t) => {
              const activeClass = {
                expense: 'bg-red-500/20 text-red-400',
                income: 'bg-green-500/20 text-green-400',
                transfer: 'bg-slate-500/20 text-slate-300',
              }[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors cursor-pointer
                    ${form.type === t ? activeClass : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field amount-font"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Account</label>
            <input
              type="text"
              className="input-field"
              placeholder="Main"
              value={form.account}
              onChange={(e) => set('account', e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm disabled:opacity-50">
              {loading ? 'Saving…' : transaction ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
