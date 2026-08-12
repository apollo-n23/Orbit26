import type { ProcessVersion, RedesignCostBreakdown } from '../types/process'
import { LAUNCH_SEQ_GO_STATIONS } from '../types/process'
import {
  getManufactureStep,
  LAUNCH_PREP_TECH_OPTIONS,
  resolveAutoMoveBooster,
  resolveKeyLubrication,
  resolveLaunchPrepTechs,
  resolveLaunchSeqRealignIds,
  resolveLaunchSeqRemovedIds,
} from './processEdit'
import {
  movedMachineIds,
  REDESIGN_BUDGET,
  remainingBudget as computeRemainingBudget,
} from './redesignCost'

/**
 * Plain-text snapshot of a process's redesign choices, for "Save my current
 * choices" — shared by the redesign workshop (live draft) and To-be play
 * (confirmed process) so both produce the exact same file format.
 */
export function buildRedesignChoicesSummary(
  process: ProcessVersion,
  roundLabel: string,
  costBreakdown: RedesignCostBreakdown,
): string {
  const machinesSorted = [...(getManufactureStep(process)?.machines ?? [])].sort(
    (a, b) => a.linePosition - b.linePosition,
  )
  const movedNow = new Set(movedMachineIds(machinesSorted))
  const lineOrder = machinesSorted.map((m) => m.name).join(', ')
  const movedNames = machinesSorted
    .filter((m) => movedNow.has(m.id))
    .map((m) => m.name)
  const autoMoveBooster = resolveAutoMoveBooster(process)
  const launchPrepTechs = resolveLaunchPrepTechs(process)
  const launchSeqRealignIds = resolveLaunchSeqRealignIds(process)
  const launchSeqRemovedIds = resolveLaunchSeqRemovedIds(process)
  const keyLubrication = resolveKeyLubrication(process)
  const techNames = launchPrepTechs.map(
    (id) => LAUNCH_PREP_TECH_OPTIONS.find((o) => o.id === id)?.name ?? id,
  )
  const realignedNames = launchSeqRealignIds.map(
    (id) => LAUNCH_SEQ_GO_STATIONS.find((s) => s.id === id)?.name ?? id,
  )
  const savedAt = new Date().toLocaleString()
  const remaining = computeRemainingBudget(costBreakdown)
  const manufactureCost =
    costBreakdown.machineMoveCost +
    costBreakdown.autoTransferCost +
    costBreakdown.formPressRepairCost

  const lines = [
    'Orb-it Redesign Workshop — saved choices',
    `${roundLabel}`,
    `Saved: ${savedAt}`,
    '',
    'MANUFACTURE',
    `Line order (left to right): ${lineOrder || 'unchanged'}`,
    `Machines moved from factory position: ${movedNames.length > 0 ? movedNames.join(', ') : 'none'}`,
    `Auto-transfer upgrade: ${autoMoveBooster ? 'On' : 'Off'}`,
    `Form press arm repaired: ${
      machinesSorted.find((m) => m.id === 'form-press')?.damaged === false
        ? 'Yes'
        : 'No'
    }`,
    '',
    'HAUL ROAD',
    `Net road cost: ${costBreakdown.roadCost} pts (tiles painted beyond the original road, minus any baseline tiles sold)`,
    '',
    'LAUNCH PREP TECHNOLOGY',
    `Selected: ${techNames.length > 0 ? techNames.join(', ') : 'none'}`,
    '',
    'LAUNCH SEQUENCE',
    `Realigned GO calls: ${realignedNames.length > 0 ? realignedNames.join(', ') : 'none'}`,
    `Removed from poll: ${
      launchSeqRemovedIds.length > 0
        ? launchSeqRemovedIds
            .map(
              (id) => LAUNCH_SEQ_GO_STATIONS.find((s) => s.id === id)?.name ?? id,
            )
            .join(', ')
        : 'none'
    }`,
    `Key lubrication: ${keyLubrication ? 'Yes' : 'No'}`,
    '',
    'COST OF IMPROVEMENT',
    `Manufacture: ${manufactureCost} pts`,
    `Haul road: ${costBreakdown.roadCost} pts`,
    `Launch prep technology: ${costBreakdown.launchPrepTechCost} pts`,
    `Launch sequence: ${costBreakdown.goRealignCost + costBreakdown.rangeRemovalCost + costBreakdown.keyLubricationCost} pts`,
    `Total: ${costBreakdown.total} pts`,
    '',
    'BUDGET',
    `Redesign budget: ${REDESIGN_BUDGET} pts`,
    `Remaining: ${remaining} pts`,
  ]
  return lines.join('\r\n')
}
