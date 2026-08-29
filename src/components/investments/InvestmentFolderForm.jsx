import { useState, useEffect } from 'react'
import { storageService } from '../../services/storageService'
import { SUPPORTED_CURRENCIES } from '../../utils/format'
import { X } from 'lucide-react'

/**
 * A folder groups several investments that fund one thing — "House investment
 * 1" holding the down payment, the loan EMI and the renovation. Its optional
 * target is what progress is measured against (the full price of the house).
 */
export default function InvestmentFolderForm({ user, ownerId, folder, onSaved, onClose }) {
  const [name, setName] = useState(folder?.name || '')
  const [target, setTarget] = useState(folder?.target_amount != null ? String(folder.target_amount) : '')
  const [currency, setCurrency] = useState(folder?.currency || 'NOK')
  const [notes, setNotes] = useState(folder?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    const targetAmount = target === '' ? null : parseFloat(target)
    if (targetAmount != null && (isNaN(targetAmount) || targetAmount < 0)) {
      setError('Target must be a non-negative number.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      user_id: ownerId || user.id,
      name: name.trim(),
      target_amount: targetAmount,
      currency,
      notes: notes.trim() || null,
    }
    const result = folder
      ? await storageService.updateInvestmentFolder(folder.id, payload)
      : await storageService.saveInvestmentFolder(payload)

    setSaving(false)
    if (result.error) setError(result.error.message)
    else onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {folder ? 'Edit folder' : 'New investment folder'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Name</label>
            <input
              autoFocus
              type="text"
              className="input-field"
              placeholder="e.g. House investment 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Target amount <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field amount-font flex-1"
                placeholder="e.g. the full price of the house"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <select
                className="input-field w-24"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-600 mt-1.5">
              What the folder is working towards. Progress counts only holdings in this
              currency — nothing is converted.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Notes <span className="text-gray-600 normal-case">(optional)</span>
            </label>
            <textarea
              rows={2}
              className="input-field resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm disabled:opacity-50">
              {saving ? 'Saving…' : folder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
