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
 * Round 1 (as-is), the Round 2 redesign workshop, and Round 2 (play).
 */
export type AppStage = 'round1' | 'redesign' | 'round2'

export function hashForStage(stage: AppStage): string {
  if (stage === 'redesign') return '#/redesign'
  if (stage === 'round2') return hashForRound(2)
  return hashForRound(1)
}

/** Parse location hash into a top-level stage. Default: round1. */
export function stageFromHash(hash: string = window.location.hash): AppStage {
  const path = hash.replace(/^#/, '').replace(/^\//, '')
  if (path === 'redesign') return 'redesign'
  if (path === 'round/2' || path === 'round2') return 'round2'
  return 'round1'
}
