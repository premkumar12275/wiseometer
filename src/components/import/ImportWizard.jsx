import { useState } from 'react'
import { parseExcel } from './parsers/excelParser'
import { parsePDF } from './parsers/pdfParser'
import { categorizeImported } from '../../constants/categories'
import { storageService } from '../../services/storageService'
import { parseAmount } from '../../utils/format'
import { toISODate } from '../../utils/date'
import UploadStep from './UploadStep'
import ColumnMapper from './ColumnMapper'
import CategoryReview from './CategoryReview'
import { CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react'

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

export default function ImportWizard({ user, onImported }) {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  const [headers, setHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [reviewRows, setReviewRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [parseError, setParseError] = useState('')

  // Step 1 → parse file
  const handleFile = async (f) => {
    setFile(f)
    setParseError('')
    const pdf = f.name.toLowerCase().endsWith('.pdf')
    setIsPdf(pdf)
    try {
      if (pdf) {
        const { rows } = await parsePDF(f)
        // PDF rows are parsed as outgoing amounts (expenses).
        const categorised = rows.map((r) => ({ ...r, ...categorizeImported(r.description, 'out') }))
        setReviewRows(categorised)
        setStep(2) // skip column mapping for PDF
      } else {
        const { headers: h, rows: r } = await parseExcel(f)
        setHeaders(h)
        setRawRows(r)
        setStep(1)
      }
    } catch (err) {
      setParseError('Could not parse the file: ' + err.message)
    }
  }

  // Step 2 → map columns → build review rows
  const handleMapped = (mapping) => {
    const rows = rawRows.map((row) => {
      // A row is an expense (money out) or income/transfer (money in). If both
      // columns hold a value, treat the non-zero one; out takes precedence.
      const out = mapping.amountOut ? parseAmount(row[mapping.amountOut]) : NaN
      const inn = mapping.amountIn ? parseAmount(row[mapping.amountIn]) : NaN
      const direction = out > 0 ? 'out' : inn > 0 ? 'in' : null
      if (!direction) return null

      const amount = direction === 'out' ? out : inn
      const rawDate = row[mapping.date]
      // Use local calendar date — see toISODate for the timezone rationale.
      const date = toISODate(rawDate) ?? String(rawDate)
      const description = String(row[mapping.description] || '')
      const { category, type, confidence } = categorizeImported(description, direction)
      return { date, description, amount, type, category, confidence }
    }).filter((r) => r && r.amount > 0 && r.date)
    setReviewRows(rows)
    setStep(2)
  }

  // Step 3 → import
  const handleConfirmed = async (included) => {
    setImporting(true)
    const today = new Date().toISOString().slice(0, 10)
    const txArray = included.map((r) => ({
      user_id: user.id,
      date: r.date || today,
      description: r.description || null,
      amount: r.amount,
      type: r.type || 'expense',
      category: r.category,
      account: 'Import',
      source: 'import',
      import_file: file?.name || null,
    }))

    const { data, error: saveErr } = await storageService.saveTransactions(txArray)
    if (saveErr) {
      setResult({ error: saveErr.message })
      setImporting(false)
      return
    }

    // Upload raw file
    let filePath = null
    const { path } = await storageService.uploadStatement(file, user.id)
    filePath = path

    // Log import
    await storageService.logImport(user.id, file.name, filePath, txArray.length)

    // Imported rows are dated by the statement (often a past month), but the app
    // view defaults to the current month — so jump to the month most rows fall in,
    // otherwise the user lands on an empty screen and thinks nothing imported.
    const monthCounts = {}
    for (const r of txArray) {
      const ym = (r.date || today).slice(0, 7)
      monthCounts[ym] = (monthCounts[ym] || 0) + 1
    }
    const topYM = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const [ty, tm] = topYM ? topYM.split('-').map(Number) : []
    const monthLabel = topYM
      ? new Date(ty, tm - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : null

    setResult({ imported: txArray.length, month: tm, year: ty, monthLabel })
    setStep(3)
    setImporting(false)
  }

  // The Map (1) and Review (2) steps have wide tables; give them more room.
  const wide = step === 1 || step === 2

  return (
    <div className="flex-1 overflow-y-auto p-6 fade-in">
      <div className={`${wide ? 'max-w-5xl' : 'max-w-2xl'} mx-auto transition-[max-width] duration-200`}>
        <StepIndicator current={step} />

        {parseError && (
          <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} />
            {parseError}
          </div>
        )}

        <div className="card p-6">
          {step === 0 && <UploadStep onFileReady={handleFile} />}

          {step === 1 && (
            <>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Map columns from your file</h3>
              <ColumnMapper headers={headers} rows={rawRows} onMapped={handleMapped} />
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Review & categorize</h3>
              {importing ? (
                <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-teal-400" />
                  <p className="text-sm">Importing transactions…</p>
                </div>
              ) : (
                <CategoryReview rows={reviewRows} onConfirmed={handleConfirmed} />
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
                    {result.imported} transaction{result.imported !== 1 ? 's' : ''} imported
                    {result.monthLabel ? ` to ${result.monthLabel}` : ''}.
                  </p>
                </>
              )}
              <button
                onClick={() => {
                  const { month, year } = result
                  setStep(0); setFile(null); setResult(null)
                  onImported?.(month, year)
                }}
                className="btn-primary text-sm px-6"
              >
                {result.error ? 'Try again' : 'View imported transactions'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
