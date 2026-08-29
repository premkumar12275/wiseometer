import { useState, useEffect, useMemo } from 'react'
import { INVESTMENT_TYPES } from '../../constants/investmentTypes'
import { storageService } from '../../services/storageService'
import { formatIn, SUPPORTED_CURRENCIES } from '../../utils/format'
import { FREQUENCIES, planProgress } from '../../utils/investmentPlan'
import ContributionScheduleEditor from './ContributionScheduleEditor'
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
  currency: 'NOK',
  folderId: '',
  isRecurring: false,
  frequency: 'monthly',
  contributionAmount: '',
  isOngoing: true,
  endDate: '',
}

export default function InvestmentForm({ user, ownerId, investment, folders = [], defaultFolderId, onSaved, onClose }) {
  const [form, setForm] = useState(investment ? {
    type: investment.type,
    name: investment.name,
    symbol: investment.symbol || '',
    quantity: investment.quantity != null ? String(investment.quantity) : '',
    purchaseDate: investment.purchase_date,
    amountInvested: String(investment.amount_invested),
    currentValue: String(investment.current_value),
    notes: investment.notes || '',
    currency: investment.currency || 'NOK',
    folderId: investment.folder_id || '',
    isRecurring: !!investment.is_recurring,
    frequency: investment.frequency || 'monthly',
    contributionAmount: investment.contribution_amount != null ? String(investment.contribution_amount) : '',
    isOngoing: investment.is_ongoing !== false,
    endDate: investment.end_date || '',
  } : { ...EMPTY, folderId: defaultFolderId || '' })
  const [changes, setChanges] = useState(
    (investment?.changes || []).map((c) => ({ effective_from: c.effective_from, amount: String(c.amount) }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Live preview of what the plan has cost so far, computed with the same code
  // the rest of the app uses — the form can't promise a different number.
  const preview = useMemo(() => planProgress(
    {
      is_recurring: form.isRecurring,
      purchase_date: form.purchaseDate,
      frequency: form.frequency,
      contribution_amount: parseFloat(form.contributionAmount) || 0,
      is_ongoing: form.isOngoing,
      end_date: form.endDate || null,
    },
    changes
      .filter((c) => c.effective_from && c.amount !== '')
      .map((c) => ({ effective_from: c.effective_from, amount: parseFloat(c.amount) }))
  ), [form.isRecurring, form.purchaseDate, form.frequency, form.contributionAmount,
      form.isOngoing, form.endDate, changes])

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

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    // A recurring plan's invested total is derived from its schedule; a one-off
    // purchase carries the figure the user typed.
    let amountInvested
    if (form.isRecurring) {
      const contribution = parseFloat(form.contributionAmount)
      if (isNaN(contribution) || contribution <= 0) {
        setError('Contribution amount must be a positive number.')
        return
      }
      const bad = changes.find(
        (c) => !c.effective_from || c.amount === '' || isNaN(parseFloat(c.amount)) || parseFloat(c.amount) < 0
      )
      if (bad) {
        setError('Every contribution change needs a date and a non-negative amount.')
        return
      }
      if (!form.isOngoing && form.endDate && form.endDate < form.purchaseDate) {
        setError('End date cannot be before the start date.')
        return
      }
      amountInvested = preview.invested
    } else {
      amountInvested = parseFloat(form.amountInvested)
      if (isNaN(amountInvested) || amountInvested <= 0) {
        setError('Amount invested must be a positive number.')
        return
      }
    }

    // A plan with no separate valuation is worth what has gone into it.
    const currentValue = form.isRecurring && form.currentValue === ''
      ? amountInvested
      : parseFloat(form.currentValue)
    if (isNaN(currentValue) || currentValue < 0) {
      setError('Current value must be a non-negative number.')
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
      // For a recurring plan this is only a snapshot — every screen recomputes
      // the real figure from the schedule.
      amount_invested: amountInvested,
      current_value: currentValue,
      notes: form.notes.trim() || null,
      currency: form.currency,
      folder_id: form.folderId || null,
      is_recurring: form.isRecurring,
      frequency: form.isRecurring ? form.frequency : null,
      contribution_amount: form.isRecurring ? parseFloat(form.contributionAmount) : null,
      is_ongoing: form.isRecurring ? form.isOngoing : true,
      end_date: form.isRecurring && !form.isOngoing && form.endDate ? form.endDate : null,
    }

    const result = investment
      ? await storageService.updateInvestment(investment.id, payload)
      : await storageService.saveInvestment({ ...payload, source: 'manual' })

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    // The schedule is stored against the row's id, which only exists once the
    // investment itself has been written.
    const id = result.data?.id || investment?.id
    if (id) {
      const { error: scheduleErr } = await storageService.replaceInvestmentChanges(
        id,
        ownerId || user.id,
        form.isRecurring
          ? changes.map((c) => ({ effective_from: c.effective_from, amount: parseFloat(c.amount) }))
          : []
      )
      if (scheduleErr) {
        setError(`Investment saved, but its schedule failed: ${scheduleErr.message}`)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onSaved()
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
          {/* Type + currency */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Currency</label>
              <select
                className="input-field"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                ))}
              </select>
            </div>
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

          {/* Folder */}
          {folders.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Folder <span className="text-gray-600 normal-case">(optional)</span>
              </label>
              <select
                className="input-field"
                value={form.folderId}
                onChange={(e) => set('folderId', e.target.value)}
              >
                <option value="">Ungrouped</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {/* Purchase / start date */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              {form.isRecurring ? 'Start Date' : 'Purchase Date'}
            </label>
            <input
              type="date"
              className="input-field"
              value={form.purchaseDate}
              onChange={(e) => set('purchaseDate', e.target.value)}
              required
            />
          </div>

          {/* Recurring plan */}
          <div className="rounded-lg border border-[#2a2d3a] p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => set('isRecurring', e.target.checked)}
                className="w-3.5 h-3.5 accent-teal-400 cursor-pointer"
              />
              <span className={`text-xs font-medium uppercase tracking-wide ${form.isRecurring ? 'text-gray-300' : 'text-gray-500'}`}>
                Recurring contribution
              </span>
            </label>
            <p className="text-[11px] text-gray-600 -mt-1.5">
              For an EMI or a standing top-up. The amount paid grows on its own each period.
            </p>

            {form.isRecurring && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Frequency</label>
                    <select
                      className="input-field"
                      value={form.frequency}
                      onChange={(e) => set('frequency', e.target.value)}
                    >
                      {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-field amount-font"
                      placeholder="e.g. 18500"
                      value={form.contributionAmount}
                      onChange={(e) => set('contributionAmount', e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={form.isOngoing}
                    onChange={(e) => set('isOngoing', e.target.checked)}
                    className="w-3.5 h-3.5 accent-teal-400 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">Ongoing</span>
                </label>

                {!form.isOngoing && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Ended on</label>
                    <input
                      type="date"
                      className="input-field"
                      min={form.purchaseDate}
                      value={form.endDate}
                      onChange={(e) => set('endDate', e.target.value)}
                    />
                  </div>
                )}

                <ContributionScheduleEditor
                  startDate={form.purchaseDate}
                  baseAmount={parseFloat(form.contributionAmount) || 0}
                  frequency={form.frequency}
                  changes={changes}
                  onChange={setChanges}
                />

                <div className="rounded-lg bg-[#1a1d27] px-3 py-2.5">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Paid so far</p>
                  <p className="amount-font text-base font-semibold text-white">
                    {formatIn(preview.invested, form.currency)}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {preview.periods} payment{preview.periods !== 1 ? 's' : ''}
                    {preview.nextDueDate && ` · next on ${preview.nextDueDate}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Amount invested — derived for a recurring plan */}
          {!form.isRecurring && (
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
          )}

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
              required={!form.isRecurring}
            />
            {form.isRecurring && (
              <p className="text-[11px] text-gray-600 mt-1.5">
                Leave blank to value the plan at what has been paid into it.
              </p>
            )}
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
