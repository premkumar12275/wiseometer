import * as pdfjsLib from 'pdfjs-dist'
import { parseAmount } from '../../../utils/format'

// Point worker to the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * Extract all text lines from a PDF file.
 * @param {File} file
 * @returns {Promise<string[]>}
 */
async function extractLines(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const lines = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Group items by approximate Y position into lines
    const byY = {}
    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push(item.str)
    }
    const sorted = Object.keys(byY)
      .map(Number)
      .sort((a, b) => b - a)
    for (const y of sorted) {
      lines.push(byY[y].join(' ').trim())
    }
  }
  return lines.filter(Boolean)
}

/**
 * Try to parse a text line into { date, description, amount }.
 * Returns null if the line doesn't look like a transaction.
 */
function parseLine(line) {
  // Match patterns like:  2024-03-15  Some merchant  -1234.56
  //                       15/03/2024  Some merchant   1 234,56
  //                       2024-03-15  Some merchant   1 234,-
  const datePattern = /(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/

  const dateMatch = line.match(datePattern)
  if (!dateMatch) return null

  // The amount is the trailing number on the line. Strip the date first so its
  // digits can't be mistaken for the amount, then anchor to the end of the line.
  // The number may use space/period thousands separators and a comma (or ",-")
  // decimal, optionally followed by a sign and a "kr"/"NOK" label.
  const rest = line.replace(dateMatch[1], ' ')
  const amountPattern = /(\d[\d.,\s]*\d|\d)([.,]-)?\s*(?:kr|nok)?\s*-?\s*$/i
  const amountMatch = rest.match(amountPattern)
  if (!amountMatch) return null

  const amountText = amountMatch[1] + (amountMatch[2] || '')
  // Require a separator (thousands, decimal, or the ",-" form) so bare integers
  // like page numbers or reference IDs aren't picked up as amounts.
  if (!/[.,\s]/.test(amountText)) return null

  const amount = parseAmount(amountText)
  if (isNaN(amount) || amount === 0) return null

  // Normalise date
  let rawDate = dateMatch[1].replace(/\//g, '-')
  // If DD-MM-YYYY → YYYY-MM-DD
  if (rawDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const parts = rawDate.split('-')
    rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  // Everything between date and amount is the description
  const dateEnd = line.indexOf(dateMatch[1]) + dateMatch[1].length
  const amountStart = line.lastIndexOf(amountMatch[1])
  const description = line
    .slice(dateEnd, amountStart)
    .replace(/\s*-?\s*(kr|nok)?\s*$/i, '')
    .trim()

  return {
    date: rawDate,
    description: description || 'Unknown',
    amount,
    confidence: description.length > 2 ? 0.75 : 0.4,
  }
}

/**
 * Parse a PDF bank statement file.
 * @param {File} file
 * @returns {Promise<{ rows: Array, rawLines: string[] }>}
 */
export async function parsePDF(file) {
  const lines = await extractLines(file)
  const rows = lines.map(parseLine).filter(Boolean)
  return { rows, rawLines: lines }
}
