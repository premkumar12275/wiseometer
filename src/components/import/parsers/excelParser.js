import * as XLSX from 'xlsx'

/**
 * Parse an Excel file and return an array of raw row objects.
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: object[] }>}
 */
export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        resolve({ headers, rows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}
