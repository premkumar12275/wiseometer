import {
  SERIES_COLORS, UNTAGGED_COLOR, OTHER_COLOR,
  UNTAGGED_LABEL, OTHER_LABEL, MAX_TAG_SERIES,
} from '../../constants/chartPalette'

/**
 * Turn raw transactions into stacked-bar data: one bar per category, split into
 * one segment per tag.
 *
 * A transaction carrying several tags is SPLIT EVENLY between them, so every
 * tag it wears is represented and the segments still add up to the category's
 * real total. Attributing the whole amount to each tag would inflate the bars;
 * attributing it to only the first would hide the others.
 *
 * Only expenses are charted — this answers "where did the money go".
 */
export function buildCategoryTagData(transactions, getCategoryById) {
  const expenses = transactions.filter((t) => t.type === 'expense')

  // Pass 1: total per tag, to decide which tags earn their own colour.
  const tagTotals = {}
  for (const t of expenses) {
    const amount = parseFloat(t.amount)
    const tags = t.tags?.length ? t.tags : [UNTAGGED_LABEL]
    const share = amount / tags.length
    for (const tag of tags) tagTotals[tag] = (tagTotals[tag] || 0) + share
  }

  const ranked = Object.entries(tagTotals)
    .filter(([tag]) => tag !== UNTAGGED_LABEL)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)

  const named = ranked.slice(0, MAX_TAG_SERIES)
  const folded = new Set(ranked.slice(MAX_TAG_SERIES))

  // Colour follows the tag, never its position in a filtered view.
  const seriesColor = {}
  named.forEach((tag, i) => { seriesColor[tag] = SERIES_COLORS[i] })
  if (folded.size > 0) seriesColor[OTHER_LABEL] = OTHER_COLOR
  if (tagTotals[UNTAGGED_LABEL]) seriesColor[UNTAGGED_LABEL] = UNTAGGED_COLOR

  const seriesFor = (tag) => (folded.has(tag) ? OTHER_LABEL : tag)

  // Pass 2: bucket by category, then by series within the category.
  const byCategory = {}
  for (const t of expenses) {
    const amount = parseFloat(t.amount)
    const tags = t.tags?.length ? t.tags : [UNTAGGED_LABEL]
    const share = amount / tags.length
    const bucket = (byCategory[t.category] ||= { total: 0, series: {} })
    bucket.total += amount
    for (const tag of tags) {
      const key = seriesFor(tag)
      bucket.series[key] = (bucket.series[key] || 0) + share
    }
  }

  // Series order matches the colour slots, with the two reserved buckets last.
  const series = [
    ...named,
    ...(folded.size > 0 ? [OTHER_LABEL] : []),
    ...(tagTotals[UNTAGGED_LABEL] ? [UNTAGGED_LABEL] : []),
  ]

  // Every row carries every series, zero-filled. A missing key would make
  // Recharts skip that segment entirely, and the per-bar total label rides on
  // the last series — so a category lacking that tag would lose its label.
  const zeroes = Object.fromEntries(series.map((s) => [s, 0]))

  const data = Object.entries(byCategory)
    .map(([categoryId, { total, series: values }]) => {
      const cat = getCategoryById(categoryId)
      return { categoryId, label: cat.label, emoji: cat.emoji, total, ...zeroes, ...values }
    })
    .sort((a, b) => b.total - a.total)

  return { data, series, seriesColor, foldedCount: folded.size }
}
