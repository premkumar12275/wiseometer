// Fixed investment types — unlike spending categories, these aren't
// user-customizable.
export const INVESTMENT_TYPES = [
  { id: 'stock',       label: 'Stocks',      emoji: '📈', color: '#3b82f6' },
  { id: 'fund',        label: 'Funds/ETFs',  emoji: '📊', color: '#8b5cf6' },
  { id: 'crypto',      label: 'Crypto',      emoji: '₿',  color: '#f59e0b' },
  { id: 'real_estate', label: 'Real Estate', emoji: '🏠', color: '#22c55e' },
  { id: 'bond',        label: 'Bonds',       emoji: '🏦', color: '#64748b' },
  { id: 'other',       label: 'Other',       emoji: '💼', color: '#6b7280' },
]

export const getInvestmentTypeById = (id) =>
  INVESTMENT_TYPES.find((t) => t.id === id) || INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1]
