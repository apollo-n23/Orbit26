import type { ProcessVersion } from './process'

import { MAX_RUNS_PER_SESSION } from './process'

/** Rockets that must be launched to finish a learning round. */
export const ROCKETS_PER_ROUND = MAX_RUNS_PER_SESSION

export type RoundId = 1 | 2

export interface RoundConfig {
  id: RoundId
  /** Short label for chrome / nav */
  label: string
  /** Longer title for the round experience */
  title: string
  /** Shown on the orbit cutaway when the round is finished */
  completeHeadline: string
  completeSubline: string
  /** Hash path for tutor share links, e.g. `#/round/2` */
  hashPath: string
  process: ProcessVersion
  /**
   * When true, learner redesigns allowed process steps before the 3 launches
   * (Round 2+). Round 1 as-is stays false.
   */
  allowsRedesign?: boolean
}

export function hashForRound(id: RoundId): string {
  return `#/round/${id}`
}

/**
 * Top-level nav stages a learner/tutor can jump between directly:
 * the Orb-it intranet home page (default landing screen), a Gemba
 * walkthrough of Round 1 as-is, Round 1 itself, the Round 2 redesign
 * workshop, Round 2 (play), the customer portal (a separate, off-to-the-side
 * stage — not part of the learning-loop flow), and the three intranet
 * destinations reached from Home (training, annual report, invoices).
 */
export type AppStage =
  | 'home'
  | 'gemba'
  | 'round1'
  | 'redesign'
  | 'round2'
  | 'customers'
  | 'training'
  | 'annual-report'
  | 'invoices'

export function hashForStage(stage: AppStage): string {
  if (stage === 'home') return '#/home'
  if (stage === 'gemba') return '#/gemba'
  if (stage === 'redesign') return '#/redesign'
  if (stage === 'round2') return hashForRound(2)
  if (stage === 'customers') return '#/customers'
  if (stage === 'training') return '#/training'
  if (stage === 'annual-report') return '#/annual-report'
  if (stage === 'invoices') return '#/invoices'
  return hashForRound(1)
}

/** Parse location hash into a top-level stage. Default: home. */
export function stageFromHash(hash: string = window.location.hash): AppStage {
  const path = hash.replace(/^#/, '').replace(/^\//, '')
  if (path === 'home') return 'home'
  if (path === 'gemba') return 'gemba'
  if (path === 'redesign') return 'redesign'
  if (path === 'round/2' || path === 'round2') return 'round2'
  if (path === 'round/1' || path === 'round1') return 'round1'
  if (path === 'customers') return 'customers'
  if (path === 'training') return 'training'
  if (path === 'annual-report') return 'annual-report'
  if (path === 'invoices') return 'invoices'
  return 'home'
}
