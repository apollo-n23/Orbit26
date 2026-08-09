import { BASELINE_PROCESS } from './baselineProcess'
import type { RoundConfig } from '../types/round'

/**
 * Round definitions. To-be starts as a near-copy of the as-is baseline;
 * process tweaks land via the redesign workshop before its three launches.
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
    label: 'As-is',
    title: 'As-is process',
    completeHeadline: 'As-is complete',
    completeSubline:
      'Three satellites are on station. Review lead times on the Data board, then continue when your tutor is ready.',
    hashPath: '#/as-is',
    process: cloneBaseline(
      'as-is',
      'As-is — booster integration',
      1,
    ),
  },
  2: {
    id: 2,
    label: 'To-be',
    title: 'To-be process',
    completeHeadline: 'To-be complete',
    completeSubline:
      'Three more satellites are on station. Lead times for this round are on the Data board.',
    hashPath: '#/to-be',
    // Starts from baseline; learner redesigns layout before the three launches.
    allowsRedesign: true,
    process: cloneBaseline(
      'to-be',
      'To-be — redesigned process',
      2,
    ),
  },
}

export function getRoundConfig(id: 1 | 2): RoundConfig {
  return ROUND_CONFIGS[id]
}
