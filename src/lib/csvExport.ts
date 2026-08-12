import type { LeadTimeEntry } from '../types/process'
import { downloadTextFile } from './fileDownload'

const CSV_HEADERS = [
  'Round',
  'Rocket',
  'Lead time (m:ss)',
  'Lead time (ms)',
  'Height achieved (mi)',
  'Redesign cost total (pts)',
  'Manufacture — machine moves (pts)',
  'Manufacture — auto-transfer (pts)',
  'Manufacture — Form press arm repair (pts)',
  'Haul road — tiles (pts)',
  'Launch prep — technology (pts)',
  'Launch sequence — realigns & removals (pts)',
  'Launch sequence — key lubrication (pts)',
  'Defects',
  'Logged at',
]

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function formatLeadTimeMmSs(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** One row per logged launch, across every round section provided (in order given). */
export function buildDataCsv(
  sections: { roundLabel: string; entries: LeadTimeEntry[] }[],
): string {
  const rows: string[][] = [CSV_HEADERS]

  for (const section of sections) {
    const ordered = [...section.entries].sort((a, b) => a.runNumber - b.runNumber)
    for (const entry of ordered) {
      const cost = entry.costBreakdown
      rows.push([
        section.roundLabel,
        String(entry.runNumber),
        formatLeadTimeMmSs(entry.durationMs),
        String(entry.durationMs),
        entry.heightStatus === 'no-capcom'
          ? 'NO CAPCOM'
          : entry.heightAchievedMiles != null
            ? String(entry.heightAchievedMiles)
            : '',
        cost != null ? String(cost.total) : '',
        cost != null ? String(cost.machineMoveCost) : '',
        cost != null ? String(cost.autoTransferCost) : '',
        cost != null ? String(cost.formPressRepairCost) : '',
        cost != null ? String(cost.roadCost) : '',
        cost != null ? String(cost.launchPrepTechCost) : '',
        cost != null ? String(cost.goRealignCost + cost.rangeRemovalCost) : '',
        cost != null ? String(cost.keyLubricationCost) : '',
        String(entry.defectCount ?? 0),
        new Date(entry.completedAt).toISOString(),
      ])
    }
  }

  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

/** Trigger a browser download of `content` as a file named `filename`. */
export function downloadCsv(filename: string, content: string): void {
  downloadTextFile(filename, content, 'text/csv;charset=utf-8;')
}
