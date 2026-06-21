// Centralized currency configuration and formatting.
// Change LOCALE / CURRENCY here to switch the app's currency everywhere.
export const LOCALE = 'nb-NO'
export const CURRENCY = 'NOK'

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
})

// Format a number as a currency string (e.g. "kr 1 234,56").
export const formatCurrency = (n) => currencyFormatter.format(n || 0)

/**
 * Parse a raw amount (number or string) into a positive number.
 *
 * Handles the Norwegian convention — comma decimal, space/period thousands,
 * a "kr"/"NOK" prefix, and the "1 234,-" whole-amount shorthand — while still
 * accepting plain US-style values ("1,234.56"). The sign is dropped: amounts
 * are stored positive and the transaction `type` determines direction.
 *
 * Returns NaN when no number can be read.
 */
export function parseAmount(raw) {
  if (raw == null) return NaN
  if (typeof raw === 'number') return Math.abs(raw)

  // Drop currency symbols/letters and whitespace; keep digits, separators, sign.
  let s = String(raw).trim().replace(/[^\d.,-]/g, '')
  if (!s) return NaN

  // Norwegian shorthand for a whole amount: "1 234,-" / "1.234,-"
  s = s.replace(/[.,]-$/, '')

  const decimalPos = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let normalized
  if (decimalPos === -1) {
    normalized = s
  } else {
    const decimals = s.length - decimalPos - 1
    if (decimals >= 1 && decimals <= 2) {
      // Last separator is the decimal point; everything else is thousands.
      const intPart = s.slice(0, decimalPos).replace(/[.,]/g, '')
      normalized = `${intPart}.${s.slice(decimalPos + 1)}`
    } else {
      // 3+ trailing digits → the separator is a thousands separator.
      normalized = s.replace(/[.,]/g, '')
    }
  }

  const n = parseFloat(normalized)
  return isNaN(n) ? NaN : Math.abs(n)
}
