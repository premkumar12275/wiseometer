export const CATEGORIES = [
  { id: 'food',          label: 'Food',           emoji: '🍔', color: '#f97316' },
  { id: 'transport',     label: 'Transport',       emoji: '🚌', color: '#3b82f6' },
  { id: 'housing',       label: 'Housing',         emoji: '🏠', color: '#8b5cf6' },
  { id: 'entertainment', label: 'Entertainment',   emoji: '🎬', color: '#ec4899' },
  { id: 'health',        label: 'Health',          emoji: '💊', color: '#10b981' },
  { id: 'shopping',      label: 'Shopping',        emoji: '🛍️', color: '#f59e0b' },
  { id: 'salary',        label: 'Salary',          emoji: '💰', color: '#22c55e' },
  { id: 'transfers',     label: 'Transfers',       emoji: '🔄', color: '#64748b' },
  { id: 'travel',        label: 'Travel',          emoji: '✈️', color: '#06b6d4' },
  { id: 'other',         label: 'Other',           emoji: '📦', color: '#6b7280' },
]

// Order matters: autoCategorize returns the first matching category. Transfers
// and salary are checked first so a strong signal like "Overføring" wins over a
// greedy spending keyword (e.g. housing's "giro" also matches "Nettgiro").
export const CATEGORY_KEYWORDS = {
  transfers:     ['overføring', 'overforing', 'transfer', 'nettgiro', 'mobilbank'],
  salary:        ['lønn', 'lonn', 'salary', 'payroll', 'wages', 'payment received'],
  food:          ['rema', 'kiwi', 'meny', 'spar', 'coop', 'joker', 'mcdonald', 'burger', 'pizza', 'restaurant', 'cafe', 'grocery', 'narvesen', 'circle k', 'kaffe', 'butikkdri', 'vita'],
  transport:     ['nsb', 'vy', 'ruter', 'bolt', 'uber', 'flytoget', 'atb', 'kolumbus', 'taxi', 'bus', 'train', 'metro', 'easypark', 'parkering', 'parkerings'],
  entertainment: ['netflix', 'spotify', 'hbo', 'viaplay', 'steam', 'gaming', 'cinema', 'movie', 'concert', 'disney', 'norway chess'],
  health:        ['apotek', 'boots', 'vitusapotek', 'lege', 'tannlege', 'clinic', 'pharmacy', 'hospital', 'doctor', 'gym', 'fitness', 'sats'],
  shopping:      ['zalando', 'h&m', 'zara', 'amazon', 'komplett', 'elkjop', 'ikea', 'clothing', 'clothes', 'klarna', 'github', 'apple.com'],
  housing:       ['husleie', 'strom', 'hafslund', 'tibber', 'fjordkraft', 'rent', 'electricity', 'internet', 'insurance', 'telenor', 'obos', 'giro'],
  travel:        ['sas', 'norwegian', 'wideroe', 'hotel', 'airbnb', 'booking', 'flight', 'airline', 'accommodation'],
}

// Categories that, when matched, imply a non-expense transaction type.
const CATEGORY_TYPE = {
  salary: 'income',
  transfers: 'transfer',
}

export const getCategoryById = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export const autoCategorize = (description) => {
  const lower = (description || '').toLowerCase()
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { category: catId, confidence: 0.8 }
    }
  }
  return { category: 'other', confidence: 0.3 }
}

/**
 * Suggest a category + type for an imported row, given the description and which
 * statement column the amount came from ('out' = withdrawal, 'in' = deposit).
 *
 * Outgoing money is always an expense. Incoming money defaults to income, but a
 * keyword match can refine it to a salary (income) or a transfer (neutral type,
 * excluded from income/expense totals).
 */
export const categorizeImported = (description, direction) => {
  const { category, confidence } = autoCategorize(description)
  const impliedType = CATEGORY_TYPE[category] // 'transfer' (transfers) or 'income' (salary)

  // Transfers are direction-agnostic and excluded from income/expense totals,
  // so an outgoing transfer stays a transfer rather than becoming an expense.
  if (impliedType === 'transfer') {
    return { category: 'transfers', type: 'transfer', confidence }
  }
  if (direction === 'out') {
    // Outgoing money is an expense; a salary category can't apply here.
    const expenseCategory = impliedType ? 'other' : category
    return { category: expenseCategory, type: 'expense', confidence }
  }
  // Incoming money: salary stays income; an unrecognised deposit defaults to salary.
  return {
    category: category === 'other' ? 'salary' : category,
    type: impliedType || 'income',
    confidence,
  }
}
