/**
 * Categorical series colors for charts that encode identity (tags), as opposed
 * to the CATEGORY colors in categories.js which belong to a specific category.
 *
 * Slot ORDER is load-bearing, not cosmetic: it is what keeps adjacent stacked
 * segments distinguishable under colour-vision deficiency. Assign slots in this
 * order and never cycle past the end — fold the tail into "Other" instead.
 *
 * Validated against this app's dark card surface (#14171f) — lightness band,
 * chroma floor, adjacent-pair CVD separation, normal-vision separation and 3:1
 * contrast all pass. Re-run the validator before changing any value here.
 */
export const SERIES_COLORS = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
]

// Reserved, deliberately outside the categorical ramp: these two mean "absence
// of a tag" and "everything else", not another identity.
export const UNTAGGED_COLOR = '#6b7280'
export const OTHER_COLOR = '#4b5563'

export const UNTAGGED_LABEL = 'Untagged'
export const OTHER_LABEL = 'Other tags'

// How many real tags get their own colour before the tail folds into "Other".
export const MAX_TAG_SERIES = SERIES_COLORS.length
