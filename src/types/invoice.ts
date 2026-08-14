/**
 * Create Invoices — a standalone 5S teaching module reached from Home.
 * Deliberately separate from the rocket-launch process: it has no
 * `ProcessVersion`, no redesign budget, and no effect on As-is/To-be.
 * `HistoricLaunch` data below is static/fictional, not derived from the
 * Data board's live `LeadTimeEntry` log.
 */
export interface HistoricLaunch {
  id: string
  customerName: string
  customerCompany: string
  missionName: string
  /** ISO date, e.g. '2026-02-14'. */
  launchDate: string
  heightAchievedMiles: number
  amountDueUsd: number
  /** Reference code the customer would quote when paying. */
  reference: string
  /**
   * Deliberately irrelevant-to-billing clutter on the record (5S "Sort" pain
   * point) — hidden once the Sort lever is enabled.
   */
  internalNote: string
}

/** Field values as the learner types them — kept as strings while editing. */
export interface InvoiceDraft {
  customerName: string
  customerCompany: string
  missionName: string
  launchDate: string
  reference: string
  amountDueUsd: string
}

export const BLANK_INVOICE_DRAFT: InvoiceDraft = {
  customerName: '',
  customerCompany: '',
  missionName: '',
  launchDate: '',
  reference: '',
  amountDueUsd: '',
}

export interface SentInvoice {
  launchId: string
  sentAt: number
  draft: InvoiceDraft
}

/** The five 5S pillars, in their usual order. */
export type InvoiceLeverId =
  | 'sort'
  | 'set-in-order'
  | 'shine'
  | 'standardize'
  | 'sustain'

export interface InvoiceLever {
  id: InvoiceLeverId
  /** Japanese term (Seiri, Seiton, ...). */
  term: string
  title: string
  description: string
  /** Card hero illustration in `public/` (no baked-in copy). */
  icon: string
  /** Wide hover-preview illustration in `public/` (no baked-in copy). */
  preview: string
}
