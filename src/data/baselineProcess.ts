import type { ProcessVersion } from '../types/process'

/**
 * Baseline process:
 * 1. Manufacture booster — operate four machines in sequence
 * 2. Haul road — haul booster along a constrained path to the pad
 * 3. Prepare for launch — mate to tower, stack payload, fuel, power up
 * 4. Launch sequence — mission-control GO calls, key arm, liftoff
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
      // Physical line order left→right: 2, 1, 4, 3 (sequence still 1→2→3→4)
      // parkOffset (rem): varied distance from belt — further stations travel more on
      // approach. As-is baseline is deliberately far (movement-waste teaching lever);
      // To-be redesign's parkOffset sliders let learners pull these back in.
      machines: [
        {
          id: 'form-press',
          sequence: 1,
          linePosition: 1,
          name: 'Form press arm',
          kind: 'robot-arm',
          parkOffset: 2.6,
          accessCode: '4821',
          damaged: true,
        },
        {
          id: 'seam-welder',
          sequence: 2,
          linePosition: 0,
          name: 'Seam welder',
          kind: 'welder',
          parkOffset: 4.4,
          accessCode: '7390',
        },
        {
          id: 'trim-laser',
          sequence: 3,
          linePosition: 3,
          name: 'Trim laser',
          kind: 'laser',
          parkOffset: 2.05,
          accessCode: '1564',
        },
        {
          id: 'fit-arm',
          sequence: 4,
          linePosition: 2,
          name: 'Fit-out arm',
          kind: 'robot-arm',
          parkOffset: 3.65,
          accessCode: '9057',
        },
      ],
    },
    {
      id: 'haul-road',
      name: 'Haul road',
      kind: 'haul',
    },
    {
      id: 'prepare-for-launch',
      name: 'Prepare for launch',
      kind: 'launch-prep',
    },
    {
      id: 'launch-sequence',
      name: 'Launch sequence',
      kind: 'launch-sequence',
    },
  ],
}
