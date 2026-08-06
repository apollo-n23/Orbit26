import type { LeadTimeEntry } from '../types/process'

/** localStorage key for Round 1 average end-to-end lead time (ms). */
export const ROUND1_AVG_LEAD_MS_KEY = 'orbit26.round1.avgLeadTimeMs'

/** Arithmetic mean of entry durations (ms), or null if empty. */
export function averageLeadTimeMs(entries: LeadTimeEntry[]): number | null {
  if (entries.length === 0) return null
  const sum = entries.reduce((acc, e) => acc + e.durationMs, 0)
  return Math.round(sum / entries.length)
}

/** Persist Round 1 average after that round’s three launches complete. */
export function saveRound1AverageLeadTimeMs(
  entries: LeadTimeEntry[],
): number | null {
  const avg = averageLeadTimeMs(entries)
  if (avg == null || typeof localStorage === 'undefined') return avg
  try {
    localStorage.setItem(ROUND1_AVG_LEAD_MS_KEY, String(avg))
  } catch {
    /* private mode / quota — ignore */
  }
  return avg
}

/** Load Round 1 average for Round 2 Data board (null if missing). */
export function loadRound1AverageLeadTimeMs(): number | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(ROUND1_AVG_LEAD_MS_KEY)
    if (raw == null || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

/** Signed improvement of round2Avg vs round1Avg (positive = faster / better). */
export function leadTimeImprovementMs(
  round1AvgMs: number,
  round2AvgMs: number,
): number {
  return round1AvgMs - round2AvgMs
}
