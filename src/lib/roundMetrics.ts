import type { LeadTimeEntry } from '../types/process'

/** localStorage key for Round 1 average end-to-end lead time (ms). */
export const ROUND1_AVG_LEAD_MS_KEY = 'orbit26.round1.avgLeadTimeMs'

/** localStorage key for Round 1 per-rocket lead times (JSON array of ms). */
export const ROUND1_LAUNCH_MS_KEY = 'orbit26.round1.launchLeadTimesMs'

/** Arithmetic mean of entry durations (ms), or null if empty. */
export function averageLeadTimeMs(entries: LeadTimeEntry[]): number | null {
  if (entries.length === 0) return null
  const sum = entries.reduce((acc, e) => acc + e.durationMs, 0)
  return Math.round(sum / entries.length)
}

/** Ordered launch durations (ms) by run number ascending. */
export function launchDurationsMs(entries: LeadTimeEntry[]): number[] {
  return [...entries]
    .sort((a, b) => a.runNumber - b.runNumber)
    .map((e) => e.durationMs)
}

/**
 * Persist Round 1 average + per-launch times after that round’s three launches complete.
 */
export function saveRound1LeadTimeResults(
  entries: LeadTimeEntry[],
): { avgMs: number; launchMs: number[] } | null {
  const avg = averageLeadTimeMs(entries)
  if (avg == null || typeof localStorage === 'undefined') {
    return avg == null ? null : { avgMs: avg, launchMs: launchDurationsMs(entries) }
  }
  const launchMs = launchDurationsMs(entries)
  try {
    localStorage.setItem(ROUND1_AVG_LEAD_MS_KEY, String(avg))
    localStorage.setItem(ROUND1_LAUNCH_MS_KEY, JSON.stringify(launchMs))
  } catch {
    /* private mode / quota — ignore */
  }
  return { avgMs: avg, launchMs }
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

/** Load Round 1 per-rocket lead times (ms), ascending rocket order. */
export function loadRound1LaunchLeadTimesMs(): number[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(ROUND1_LAUNCH_MS_KEY)
    if (raw == null || raw === '') return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    const nums = parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n >= 0)
    return nums.length > 0 ? nums : null
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
