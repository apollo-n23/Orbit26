import { BASELINE_PROCESS } from './baselineProcess'
import type { RoundConfig } from '../types/round'

/**
 * Round definitions. Round 2 starts as a near-copy of the as-is baseline;
 * process tweaks land in later increments.
 */
function cloneBaseline(
  id: string,
  name: string,
  version: number,
): RoundConfig['process'] {
  const process = structuredClone(BASELINE_PROCESS)
  process.id = id
  process.name = name
  process.version = version
  return process
}

export const ROUND_CONFIGS: Record<1 | 2, RoundConfig> = {
  1: {
    id: 1,
    label: 'Round 1 · As-is',
    title: 'As-is process',
    completeHeadline: 'As-is round complete',
    completeSubline:
      'Three satellites are on station. Review lead times on the Data board, then continue when your tutor is ready.',
    hashPath: '#/round/1',
    process: cloneBaseline(
      'round-1-as-is',
      'Round 1 — As-is booster integration',
      1,
    ),
  },
  2: {
    id: 2,
    label: 'Round 2',
    title: 'Round 2 process',
    completeHeadline: 'Round 2 complete',
    completeSubline:
      'Three more satellites are on station. Lead times for this round are on the Data board.',
    hashPath: '#/round/2',
    // Minimal change for now: same process, distinct identity for later redesign.
    process: cloneBaseline(
      'round-2-baseline-copy',
      'Round 2 — Process (baseline copy)',
      2,
    ),
  },
}

export function getRoundConfig(id: 1 | 2): RoundConfig {
  return ROUND_CONFIGS[id]
}
