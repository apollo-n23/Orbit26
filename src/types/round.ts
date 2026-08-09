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
  /** Hash path for tutor share links, e.g. `#/to-be` */
  hashPath: string
  process: ProcessVersion
  /**
   * When true, learner redesigns allowed process steps before the 3 launches
   * (To-be). As-is stays false.
   */
  allowsRedesign?: boolean
}

/** Preferred deep-link hash for a learning round (Lean names). */
export function hashForRound(id: RoundId): string {
  return id === 2 ? '#/to-be' : '#/as-is'
}

/**
 * Top-level nav stages a learner/tutor can jump between directly:
 * the Orb-it intranet home page (default landing screen), a Gemba
 * walkthrough of the as-is process, As-is play, the To-be redesign
 * workshop, To-be play, the customer portal and regulation library
 * (separate, off-to-the-side stages — not part of the learning-loop
 * flow), and the three intranet destinations reached from Home
 * (training, annual report, invoices).
 *
 * Stage ids use Lean names (`as-is` / `to-be`); hash paths keep
 * `#/round/1` and `#/round/2` for tutor share-link stability.
 */
export type AppStage =
  | 'home'
  | 'gemba'
  | 'as-is'
  | 'redesign'
  | 'to-be'
  | 'customers'
  | 'regulation'
  | 'training'
  | 'annual-report'
  | 'invoices'

export function hashForStage(stage: AppStage): string {
  if (stage === 'home') return '#/home'
  if (stage === 'gemba') return '#/gemba'
  if (stage === 'redesign') return '#/redesign'
  // Preferred Lean names; `#/round/1` and `#/round/2` still parse (tutor links).
  if (stage === 'to-be') return '#/to-be'
  if (stage === 'customers') return '#/customers'
  if (stage === 'regulation') return '#/regulation'
  if (stage === 'training') return '#/training'
  if (stage === 'annual-report') return '#/annual-report'
  if (stage === 'invoices') return '#/invoices'
  if (stage === 'as-is') return '#/as-is'
  return '#/as-is'
}

/** Parse location hash into a top-level stage. Default: home. */
export function stageFromHash(hash: string = window.location.hash): AppStage {
  const path = hash.replace(/^#/, '').replace(/^\//, '')
  if (path === 'home') return 'home'
  if (path === 'gemba') return 'gemba'
  if (path === 'redesign') return 'redesign'
  // To-be: preferred path + legacy round aliases
  if (
    path === 'to-be' ||
    path === 'tobe' ||
    path === 'round/2' ||
    path === 'round2'
  ) {
    return 'to-be'
  }
  // As-is: preferred path + legacy round aliases
  if (
    path === 'as-is' ||
    path === 'asis' ||
    path === 'round/1' ||
    path === 'round1'
  ) {
    return 'as-is'
  }
  if (path === 'customers') return 'customers'
  if (path === 'regulation') return 'regulation'
  if (path === 'training') return 'training'
  if (path === 'annual-report') return 'annual-report'
  if (path === 'invoices') return 'invoices'
  return 'home'
}
