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

/** Parse location hash into a round. Default: round 1. */
export function roundIdFromHash(hash: string = window.location.hash): RoundId {
  const path = hash.replace(/^#/, '').replace(/^\//, '')
  if (path === 'round/2' || path === 'round2') return 2
  return 1
}

export function hashForRound(id: RoundId): string {
  return `#/round/${id}`
}
