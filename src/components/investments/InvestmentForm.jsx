import { useState, useEffect } from 'react'
import { INVESTMENT_TYPES } from '../../constants/investmentTypes'
import { storageService } from '../../services/storageService'
import { X } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  type: 'other',
  name: '',
  symbol: '',
  quantity: '',
  purchaseDate: today(),
  amountInvested: '',
  currentValue: '',
  notes: '',
}

export default function InvestmentForm({ user, ownerId, investment, onSaved, onClose }) {
  const [form, setForm] = useState(investment ? {
    type: investment.type,
    name: investment.name,
    symbol: investment.symbol || '',
    quantity: investment.quantity != null ? String(investment.quantity) : '',
    purchaseDate: investment.purchase_date,
    amountInvested: String(investment.amount_invested),
    currentValue: String(investment.current_value),
    notes: investment.notes || '',
  } : EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Current value defaults to the amount invested until the user overrides it.
  const handleAmountInvestedChange = (value) => {
    setForm((f) => ({
      ...f,
      amountInvested: value,
      currentValue: !investment && (f.currentValue === '' || f.currentValue === f.amountInvested) ? value : f.currentValue,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const amountInvested = parseFloat(form.amountInvested)
    if (isNaN(amountInvested) || amountInvested <= 0) {
      setError('Amount invested must be a positive number.')
      return
    }
    const currentValue = parseFloat(form.currentValue)
    if (isNaN(currentValue) || currentValue < 0) {
      setError('Current value must be a non-negative number.')
      return
    }
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setLoading(true)

    const payload = {
      user_id: ownerId || user.id,
      type: form.type,
      name: form.name.trim(),
      symbol: form.symbol.trim() || null,
      quantity: form.quantity !== '' ? parseFloat(form.quantity) : null,
      purchase_date: form.purchaseDate,
      amount_invested: amountInvested,
      current_value: currentValue,
      notes: form.notes.trim() || null,
    }

    let result
    if (investment) {
      result = await storageService.updateInvestment(investment.id, payload)
    } else {
      result = await storageService.saveInvestment({ ...payload, source: 'manual' })
    }

    if (result.error) setError(result.error.message)
    else onSaved()
    setLoading(false)
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {investment ? 'Edit Investment' : 'Add Investment'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {INVESTMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Equinor ASA"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Symbol <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. EQNR"
              value={form.symbol}
              onChange={(e) => set('symbol', e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Quantity <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              className="input-field amount-font"
              placeholder="Units/shares"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
            />
          </div>

          {/* Purchase date */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Purchase Date</label>
            <input
              type="date"
              className="input-field"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
              required
            />
          </div>

          {/* Amount invested */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Amount Invested</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input-field amount-font"
              placeholder="0.00"
              value={form.amountInvested}
              onChange={(e) => handleAmountInvestedChange(e.target.value)}
              required
            />
          </div>

          {/* Current value */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Current Value</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field amount-font"
              placeholder="0.00"
              value={form.currentValue}
              onChange={(e) => set('currentValue', e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Notes <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              className="input-field resize-none"
              placeholder="Optional comment…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
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
              {loading ? 'Saving…' : investment ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
