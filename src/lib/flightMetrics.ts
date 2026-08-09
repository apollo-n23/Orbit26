/** Randomised per-launch orbital insertion height, in miles. */
export const HEIGHT_ACHIEVED_MIN_MILES = 60
export const HEIGHT_ACHIEVED_MAX_MILES = 90

/** Height achieved for a single launch (miles), randomised within range. */
export function randomHeightAchievedMiles(): number {
  return Math.round(
    HEIGHT_ACHIEVED_MIN_MILES +
      Math.random() * (HEIGHT_ACHIEVED_MAX_MILES - HEIGHT_ACHIEVED_MIN_MILES),
  )
}

export function formatHeightMiles(miles: number | undefined): string {
  if (miles == null) return '—'
  return `${miles} mi`
}

/** Display height for a lead-time board / CSV entry (handles Capcom removal). */
export function formatHeightAchieved(entry: {
  heightAchievedMiles?: number
  heightStatus?: 'no-capcom'
}): string {
  if (entry.heightStatus === 'no-capcom') return 'NO CAPCOM'
  return formatHeightMiles(entry.heightAchievedMiles)
}
