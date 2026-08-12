import type { LeadTimeEntry, ProcessVersion } from '../types/process'
import type { RoundId } from '../types/round'

/** Bumped only if the save shape changes in a way old files can't satisfy. */
const SAVE_FILE_VERSION = 1

/** Unique, comma-free marker so the save row is easy to find without a CSV parser. */
const SAVE_STATE_MARKER = 'ORBIT26_SAVE_STATE_V1'

export interface SaveFileRoundData {
  roundId: RoundId
  process: ProcessVersion
  leadTimeLog: LeadTimeEntry[]
}

export interface SaveFileV1 {
  version: typeof SAVE_FILE_VERSION
  exportedAt: string
  rounds: SaveFileRoundData[]
}

export interface UploadSaveResult {
  ok: boolean
  message: string
}

function csvEscapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Appends a machine-readable save-state row after the human-readable CSV so
 * the exact same downloaded file doubles as a "save game" — re-uploading it
 * (see parseSaveFileText) restores both rounds' redesign choices and
 * lead-time logs to the state they were in at download time. A spreadsheet
 * just sees one extra long row; the app's own uploader looks for the marker.
 */
export function buildSaveFileText(csv: string, save: SaveFileV1): string {
  const row = [SAVE_STATE_MARKER, JSON.stringify(save)]
    .map(csvEscapeCell)
    .join(',')
  return `${csv}\r\n${row}`
}

function isValidRoundData(value: unknown): value is SaveFileRoundData {
  if (value == null || typeof value !== 'object') return false
  const v = value as Partial<SaveFileRoundData>
  return (
    (v.roundId === 1 || v.roundId === 2) &&
    v.process != null &&
    typeof v.process === 'object' &&
    Array.isArray(v.leadTimeLog)
  )
}

/**
 * Extracts and validates the save-state payload from a downloaded file's
 * text (as read back via FileReader). Returns null for anything that isn't
 * one of this app's own save files — an unrelated CSV/text file, a hand-
 * edited file with a corrupted JSON cell, or a future/older incompatible
 * version.
 */
export function parseSaveFileText(text: string): SaveFileV1 | null {
  const markerIndex = text.indexOf(SAVE_STATE_MARKER)
  if (markerIndex === -1) return null

  const afterMarker = text.slice(markerIndex + SAVE_STATE_MARKER.length)
  const commaIndex = afterMarker.indexOf(',')
  if (commaIndex === -1) return null
  let jsonCell = afterMarker.slice(commaIndex + 1).trim()

  if (jsonCell.startsWith('"') && jsonCell.endsWith('"')) {
    jsonCell = jsonCell.slice(1, -1).replace(/""/g, '"')
  }

  try {
    const parsed = JSON.parse(jsonCell) as Partial<SaveFileV1>
    if (
      parsed.version !== SAVE_FILE_VERSION ||
      !Array.isArray(parsed.rounds) ||
      parsed.rounds.length === 0 ||
      !parsed.rounds.every(isValidRoundData)
    ) {
      return null
    }
    return parsed as SaveFileV1
  } catch {
    return null
  }
}
