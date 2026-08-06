import type { ProcessVersion } from '../types/process'
import { HAUL_STEP_TIME, LAUNCH_PREP_STEP_TIME } from '../types/process'

/**
 * Baseline process:
 * 1. Manufacture booster — operate four machines in sequence
 * 2. Integrate payload — haul booster along a constrained path to the pad
 * 3. Prepare for launch — mate to tower, stack payload, fuel, power up
 */
export const BASELINE_PROCESS: ProcessVersion = {
  id: 'baseline-v1',
  name: 'Booster integration — baseline',
  version: 1,
  steps: [
    {
      id: 'manufacture-booster',
      name: 'Manufacture booster',
      kind: 'manufacture',
      baseTime: 48,
      defectProbability: 0,
      // Physical line order left→right: 2, 1, 4, 3 (sequence still 1→2→3→4)
      machines: [
        {
          id: 'form-press',
          sequence: 1,
          linePosition: 1,
          name: 'Form press arm',
          kind: 'robot-arm',
          workTime: 12,
        },
        {
          id: 'seam-welder',
          sequence: 2,
          linePosition: 0,
          name: 'Seam welder',
          kind: 'welder',
          workTime: 14,
        },
        {
          id: 'trim-laser',
          sequence: 3,
          linePosition: 3,
          name: 'Trim laser',
          kind: 'laser',
          workTime: 10,
        },
        {
          id: 'fit-arm',
          sequence: 4,
          linePosition: 2,
          name: 'Fit-out arm',
          kind: 'robot-arm',
          workTime: 12,
        },
      ],
    },
    {
      id: 'integrate-payload',
      name: 'Integrate payload',
      kind: 'haul',
      baseTime: HAUL_STEP_TIME,
      defectProbability: 0,
    },
    {
      id: 'prepare-for-launch',
      name: 'Prepare for launch',
      kind: 'launch-prep',
      baseTime: LAUNCH_PREP_STEP_TIME,
      defectProbability: 0,
    },
  ],
}
