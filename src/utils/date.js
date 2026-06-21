// Date helpers for import parsing.

/**
 * Format a date value as a local "YYYY-MM-DD" string.
 *
 * Excel cells come through SheetJS as JS Date objects in local time. Using
 * `toISOString()` would convert to UTC and shift the calendar day backwards for
 * users east of UTC (e.g. Norway, UTC+1/+2), landing every transaction a day
 * early. Reading the local Y/M/D components keeps the intended calendar date.
 *
 * Returns null when the value can't be parsed into a date.
 */
export function toISODate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
