// AI_HOOK: Auto-categorize a transaction by description
// Will call Supabase Edge Function → Anthropic API
export async function aiCategorize(description) {
  // TODO: implement
  // Input:  { description: string }
  // Output: { category: string, confidence: number }
  return null
}

// AI_HOOK: Generate monthly spending insights
export async function aiInsights(transactions) {
  // TODO: implement
  // Input:  { transactions[] }
  // Output: { summary: string, suggestions: string[], anomalies: [] }
  return null
}

// AI_HOOK: Flag unusual transactions
export async function aiAnomalyDetect(transactions) {
  // TODO: implement
  // Output: { flagged: [{ id, reason }] }
  return null
}
