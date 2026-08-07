import type {
  LaunchPrepTech,
  ProcessMachine,
  RedesignCostBreakdown,
} from '../types/process'
import { getManufactureStep } from './processEdit'
import { BASELINE_PROCESS } from '../data/baselineProcess'

/**
 * Point costs for each redesign investment, balanced semi-realistically:
 * a cheap operational tweak (nudging a machine, realigning a GO call) costs
 * far less than a capital upgrade (an autonomous drone), and removing a
 * safety-poll station sits mid-scale — a real process change, but not
 * hardware. Road tiles keep their existing per-tile cost (roadGrid.ts) and
 * are the only category that can go back down.
 */
export const MACHINE_MOVE_COST = 15
export const AUTO_TRANSFER_COST = 40
export const GO_REALIGN_COST = 10
export const RANGE_REMOVAL_COST = 35
/** Key lubrication: a cheap, simple mechanical fix with an outsized payoff. */
export const KEY_LUBRICATION_COST = 15

export const LAUNCH_PREP_TECH_COST: Record<LaunchPrepTech, number> = {
  'faster-pumps': 20,
  'auto-power': 25,
  'payload-drone': 50,
  'strongback-redesign': 20,
}

/**
 * Total redesign budget for a Round 2 session (points). Once the running
 * total of improvement reaches this, no further cost-increasing choice can
 * be made — only selling road tiles (which reduces the total) frees up
 * room again.
 */
export const REDESIGN_BUDGET = 180

/** Budget left before hitting REDESIGN_BUDGET, given the current breakdown. */
export function remainingBudget(breakdown: RedesignCostBreakdown): number {
  return REDESIGN_BUDGET - breakdown.total
}

/** Baseline (factory-default) line position for each manufacture machine id. */
const BASELINE_MACHINE_POSITIONS: Record<string, number> = (() => {
  const machines = getManufactureStep(BASELINE_PROCESS)?.machines ?? []
  const out: Record<string, number> = {}
  for (const m of machines) out[m.id] = m.linePosition
  return out
})()

/** Ids of machines whose current line position differs from the factory default. */
export function movedMachineIds(machines: ProcessMachine[]): string[] {
  return machines
    .filter((m) => {
      const baseline = BASELINE_MACHINE_POSITIONS[m.id]
      return baseline !== undefined && m.linePosition !== baseline
    })
    .map((m) => m.id)
}

/** Assemble the total from its parts. */
export function buildCostBreakdown(parts: {
  machineMoveCost: number
  autoTransferCost: number
  roadCost: number
  launchPrepTechCost: number
  goRealignCost: number
  rangeRemovalCost: number
  keyLubricationCost: number
}): RedesignCostBreakdown {
  return {
    ...parts,
    total:
      parts.machineMoveCost +
      parts.autoTransferCost +
      parts.roadCost +
      parts.launchPrepTechCost +
      parts.goRealignCost +
      parts.rangeRemovalCost +
      parts.keyLubricationCost,
  }
}

export const EMPTY_COST_BREAKDOWN: RedesignCostBreakdown = buildCostBreakdown({
  machineMoveCost: 0,
  autoTransferCost: 0,
  roadCost: 0,
  launchPrepTechCost: 0,
  goRealignCost: 0,
  rangeRemovalCost: 0,
  keyLubricationCost: 0,
})
