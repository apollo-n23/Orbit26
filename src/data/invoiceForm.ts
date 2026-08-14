import type { HistoricLaunch, InvoiceDraft } from '../types/invoice'

/**
 * Launch-record slip order — the fixed "input slip" the learner reads from.
 * Set in Order makes the invoice form match this sequence so transcription
 * runs top-to-bottom without hunting.
 */
export const SOURCE_SLIP_FIELD_ORDER: (keyof InvoiceDraft)[] = [
  'missionName',
  'customerName',
  'customerCompany',
  'launchDate',
  'reference',
  'amountDueUsd',
]

/**
 * "Set in Order" form order — identical to the launch-record slip so the
 * form and the input document line up when this lever is on.
 */
export const SET_IN_ORDER_FIELD_ORDER: (keyof InvoiceDraft)[] =
  SOURCE_SLIP_FIELD_ORDER

/** Baseline form order — deliberately not the slip order (hunting waste). */
export const SCRAMBLED_FIELD_ORDER: (keyof InvoiceDraft)[] = [
  'amountDueUsd',
  'missionName',
  'reference',
  'customerCompany',
  'launchDate',
  'customerName',
]

export const FIELD_META: Record<
  keyof InvoiceDraft,
  { label: string; example: string }
> = {
  customerName: { label: 'Customer contact name', example: 'e.g. Priya Anand' },
  customerCompany: { label: 'Customer company', example: 'e.g. NimbusLink' },
  missionName: { label: 'Mission name', example: 'e.g. NimbusLink Relay-7' },
  launchDate: { label: 'Launch date', example: 'e.g. 2026-01-12' },
  reference: { label: 'Invoice reference', example: 'e.g. ORB-1042' },
  amountDueUsd: {
    label: 'Amount due (USD)',
    example: 'e.g. 186400',
  },
}

/** Display value on the launch-record slip (amount shown as currency). */
export function formatSlipFieldValue(
  launch: HistoricLaunch,
  key: keyof InvoiceDraft,
): string {
  if (key === 'amountDueUsd') {
    return `$${launch.amountDueUsd.toLocaleString()}`
  }
  return String(launch[key])
}

/**
 * Parse the amount the learner typed. Accepts the slip's currency form
 * (`$186,400`) as well as a bare number (`186400`).
 */
export function parseAmountDueUsd(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, '')
  if (!cleaned) return null
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}
