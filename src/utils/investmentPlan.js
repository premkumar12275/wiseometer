import { toISODate } from './date'

/**
 * Recurring investment plans (a monthly house EMI, a quarterly fund top-up).
 *
 * The amount paid so far is DERIVED, never stored as the truth: it is the sum
 * of every contribution due between the plan's start and today. That is what
 * lets "paid so far" grow on its own as months pass, with nothing writing to
 * the row.
 *
 * A change to the contribution ("from March the EMI is 21 000") applies only to
 * periods on or after its effective date — earlier periods keep the amount that
 * was actually paid then, so a rate reset can't rewrite history.
 */

export const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly', months: 1, per: '/mo' },
  { id: 'quarterly', label: 'Quarterly', months: 3, per: '/qtr' },
  { id: 'yearly', label: 'Yearly', months: 12, per: '/yr' },
]

export const getFrequency = (id) => FREQUENCIES.find((f) => f.id === id) || FREQUENCIES[0]

const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return { y, m, d }
}

const daysInMonth = (y, m) => new Date(y, m, 0).getDate()

// Advance by whole months, clamping the day to the shorter month — a plan that
// starts on the 31st bills the 28th in February rather than skipping to March.
function addMonths({ y, m, d }, months) {
  const total = (y * 12 + (m - 1)) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) }
}

const toISO = ({ y, m, d }) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/**
 * Every due date from `start` up to and including `end`, stepping by frequency.
 * Capped so a misconfigured plan can't spin — 1200 monthly periods is a century.
 */
export function dueDates(startISO, frequencyId, endISO) {
  if (!startISO || !endISO || endISO < startISO) return []
  const step = getFrequency(frequencyId).months
  const dates = []
  let cursor = parseISO(startISO)
  for (let i = 0; i < 1200; i++) {
    const iso = toISO(cursor)
    if (iso > endISO) break
    dates.push(iso)
    cursor = addMonths(parseISO(startISO), step * (i + 1))
  }
  return dates
}

/**
 * Work out what a recurring investment has cost so far.
 *
 * @param investment the row: purchase_date (start), frequency,
 *   contribution_amount (the starting amount), is_ongoing, end_date
 * @param changes    [{ effective_from, amount }] — contribution changes
 * @param asOfISO    defaults to today; contributions are never accrued ahead of it
 *
 * Returns { periods, invested, segments, nextDueDate, lastDueDate }, where
 * `segments` collapses consecutive periods that share an amount, for display.
 */
export function planProgress(investment, changes = [], asOfISO = toISODate(new Date())) {
  const start = investment?.purchase_date
  if (!investment?.is_recurring || !start) {
    return { periods: 0, invested: 0, segments: [], nextDueDate: null, lastDueDate: null }
  }

  // Never accrue beyond today, even if the plan has an end date in the future.
  const hardEnd = investment.is_ongoing
    ? asOfISO
    : (investment.end_date && investment.end_date < asOfISO ? investment.end_date : asOfISO)

  const ordered = [...changes]
    .filter((c) => c?.effective_from && c.amount != null)
    .sort((a, b) => (a.effective_from < b.effective_from ? -1 : 1))

  const baseAmount = parseFloat(investment.contribution_amount) || 0
  const amountOn = (iso) => {
    let amount = baseAmount
    for (const c of ordered) {
      if (c.effective_from <= iso) amount = parseFloat(c.amount)
      else break
    }
    return amount
  }

  const dates = dueDates(start, investment.frequency, hardEnd)

  let invested = 0
  const segments = []
  for (const iso of dates) {
    const amount = amountOn(iso)
    invested += amount
    const last = segments[segments.length - 1]
    if (last && last.amount === amount) {
      last.to = iso
      last.periods += 1
      last.subtotal += amount
    } else {
      segments.push({ from: iso, to: iso, amount, periods: 1, subtotal: amount })
    }
  }

  const lastDueDate = dates.length ? dates[dates.length - 1] : null
  // Only an ongoing plan has a next payment.
  let nextDueDate = null
  if (investment.is_ongoing && lastDueDate) {
    const step = getFrequency(investment.frequency).months
    nextDueDate = toISO(addMonths(parseISO(start), step * dates.length))
  }

  return { periods: dates.length, invested, segments, nextDueDate, lastDueDate }
}

/**
 * What an investment has cost so far — the derived total for a recurring plan,
 * the stored figure for a one-off purchase. Every screen goes through this so
 * a plan's stored snapshot can never be shown as the truth.
 */
export function investedAmount(investment, changes = [], asOfISO) {
  if (investment?.is_recurring) return planProgress(investment, changes, asOfISO).invested
  return parseFloat(investment?.amount_invested) || 0
}

// Short human label for a plan, e.g. "18 500/mo · ongoing since Mar 2024".
export function planSummaryParts(investment) {
  const freq = getFrequency(investment.frequency)
  return {
    per: freq.per,
    label: freq.label,
    status: investment.is_ongoing ? 'ongoing' : 'ended',
  }
}
