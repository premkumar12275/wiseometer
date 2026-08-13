import { useState } from 'react'
import { parseExcel } from '../import/parsers/excelParser'
import { storageService } from '../../services/storageService'
import { parseAmount } from '../../utils/format'
import { toISODate } from '../../utils/date'
import UploadStep from '../import/UploadStep'
import InvestmentColumnMapper from './InvestmentColumnMapper'
import InvestmentReview from './InvestmentReview'
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'

const STEPS = ['Upload', 'Map Columns', 'Review', 'Complete']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                  ${done ? 'bg-teal-400 text-[#0f1117]' : active ? 'bg-teal-400/20 text-teal-400 border border-teal-400' : 'bg-[#1f2233] text-gray-600 border border-[#2a2d3a]'}`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap ${active ? 'text-teal-400' : done ? 'text-gray-400' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-12px] ${i < current ? 'bg-teal-400' : 'bg-[#2a2d3a]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function InvestmentImportWizard({ user, ownerId, onImported, onClose }) {
  const [step, setStep] = useState(0)
  const [headers, setHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [reviewRows, setReviewRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [parseError, setParseError] = useState('')

  // Step 1 → parse file
  const handleFile = async (f) => {
    setParseError('')
    try {
      const { headers: h, rows: r } = await parseExcel(f)
      setHeaders(h)
      setRawRows(r)
      setStep(1)
    } catch (err) {
      setParseError('Could not parse the file: ' + err.message)
    }
  }

  // Step 2 → map columns → build review rows
  const handleMapped = (mapping) => {
    const rows = rawRows.map((row) => {
      const name = String(row[mapping.name] || '').trim()
      if (!name) return null

      const amountInvested = mapping.amountInvested ? parseAmount(row[mapping.amountInvested]) : NaN
      if (isNaN(amountInvested) || amountInvested <= 0) return null

      const currentValueRaw = mapping.currentValue ? parseAmount(row[mapping.currentValue]) : NaN
      const currentValue = isNaN(currentValueRaw) ? amountInvested : currentValueRaw

      const rawDate = row[mapping.purchaseDate]
      const purchaseDate = toISODate(rawDate) ?? String(rawDate)

      const symbol = mapping.symbol ? String(row[mapping.symbol] || '').trim() : ''
      const quantityRaw = mapping.quantity ? parseFloat(String(row[mapping.quantity]).replace(',', '.')) : NaN
      const quantity = isNaN(quantityRaw) ? null : quantityRaw
      const notes = mapping.notes ? String(row[mapping.notes] || '') : ''

      return { name, symbol, type: 'other', purchaseDate, quantity, amountInvested, currentValue, notes }
    }).filter((r) => r && r.purchaseDate)
    setReviewRows(rows)
    setStep(2)
  }

  // Step 3 → import
  const handleConfirmed = async (included) => {
    setImporting(true)
    const invArray = included.map((r) => ({
      user_id: ownerId || user.id,
      name: r.name,
      symbol: r.symbol || null,
      type: r.type || 'other',
      quantity: r.quantity,
      purchase_date: r.purchaseDate,
      amount_invested: r.amountInvested,
      current_value: r.currentValue,
      notes: r.notes || null,
      source: 'import',
    }))

    const { error: saveErr } = await storageService.saveInvestments(invArray)
    if (saveErr) {
      setResult({ error: saveErr.message })
      setImporting(false)
      return
    }

    setResult({ imported: invArray.length })
    setStep(3)
    setImporting(false)
  }

  const wide = step === 1 || step === 2

  return (
    <div className="flex-1 overflow-y-auto p-6 fade-in">
      <div className={`${wide ? 'max-w-5xl' : 'max-w-2xl'} mx-auto transition-[max-width] duration-200`}>
        {onClose && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">Import investments</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close import"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <StepIndicator current={step} />

        {parseError && (
          <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {parseError}
          </div>
        )}

        <div className="card p-6">
          {step === 0 && (
            <UploadStep
              onFileReady={handleFile}
              accept={['.xlsx', '.xls']}
              title="Drop your investment statement here"
              subtitle="Supports Excel (.xlsx, .xls)"
            />
          )}

          {step === 1 && (
            <>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Map columns from your file</h3>
              <InvestmentColumnMapper headers={headers} rows={rawRows} onMapped={handleMapped} />
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Review & classify</h3>
              {importing ? (
                <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-teal-400" />
                  <p className="text-sm">Importing investments…</p>
                </div>
              ) : (
                <InvestmentReview rows={reviewRows} onConfirmed={handleConfirmed} />
              )}
            </>
          )}

          {step === 3 && result && (
            <div className="flex flex-col items-center py-10 gap-4 fade-in">
              {result.error ? (
                <>
                  <AlertCircle size={40} className="text-red-400" strokeWidth={1.5} />
                  <p className="text-base font-semibold text-white">Import failed</p>
                  <p className="text-sm text-gray-500">{result.error}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 size={40} className="text-teal-400" strokeWidth={1.5} />
                  <p className="text-base font-semibold text-white">Import complete!</p>
                  <p className="text-sm text-gray-400">
                    {result.imported} investment{result.imported !== 1 ? 's' : ''} imported.
                  </p>
                </>
              )}
              <button
                onClick={() => {
                  setStep(0); setResult(null)
                  onImported?.()
                }}
                className="btn-primary text-sm px-6"
              >
                {result.error ? 'Try again' : 'View investments'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
