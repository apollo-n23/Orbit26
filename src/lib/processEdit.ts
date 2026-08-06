import type {
  HaulPathPoint,
  ProcessMachine,
  ProcessStep,
  ProcessVersion,
} from '../types/process'
import { HAUL_PATH, type Point } from './pathGeometry'

export function getManufactureStep(
  process: ProcessVersion,
): ProcessStep | undefined {
  return process.steps.find((s) => s.kind === 'manufacture')
}

export function getHaulStep(process: ProcessVersion): ProcessStep | undefined {
  return process.steps.find((s) => s.kind === 'haul')
}

function clonePath(path: Point[] | HaulPathPoint[]): HaulPathPoint[] {
  return path.map((p) => ({ x: Number(p.x), y: Number(p.y) }))
}

/**
 * Resolve the haul centerline for play: redesign override → step.haulPath → default.
 */
export function resolveHaulPath(process: ProcessVersion): Point[] {
  const fromVersion = process.haulPathOverride
  if (Array.isArray(fromVersion) && fromVersion.length >= 2) {
    return clonePath(fromVersion)
  }
  const fromStep = getHaulStep(process)?.haulPath
  if (Array.isArray(fromStep) && fromStep.length >= 2) {
    return clonePath(fromStep)
  }
  return clonePath(HAUL_PATH)
}

/** Reassign linePosition 0..n-1 from left-to-right ordered machine ids. */
export function applyMachineLineOrder(
  process: ProcessVersion,
  orderedMachineIds: string[],
): ProcessVersion {
  const mfg = getManufactureStep(process)
  if (!mfg?.machines) return process

  const byId = new Map(mfg.machines.map((m) => [m.id, m]))
  const nextMachines: ProcessMachine[] = []
  orderedMachineIds.forEach((id, linePosition) => {
    const m = byId.get(id)
    if (m) nextMachines.push({ ...m, linePosition })
  })
  for (const m of mfg.machines) {
    if (!orderedMachineIds.includes(m.id)) {
      nextMachines.push({ ...m, linePosition: nextMachines.length })
    }
  }

  return updateManufactureMachines(process, nextMachines)
}

export function applyMachineParkOffset(
  process: ProcessVersion,
  machineId: string,
  parkOffset: number,
): ProcessVersion {
  const mfg = getManufactureStep(process)
  if (!mfg?.machines) return process
  const clamped = Math.min(3.2, Math.max(0.4, parkOffset))
  const nextMachines = mfg.machines.map((m) =>
    m.id === machineId ? { ...m, parkOffset: clamped } : m,
  )
  return updateManufactureMachines(process, nextMachines)
}

function updateManufactureMachines(
  process: ProcessVersion,
  machines: ProcessMachine[],
): ProcessVersion {
  return {
    ...process,
    steps: process.steps.map((s) =>
      s.kind === 'manufacture' ? { ...s, machines: machines.map((m) => ({ ...m })) } : s,
    ),
  }
}

/** Persist a redesigned haul centerline on the process (step + version override). */
export function applyHaulPath(
  process: ProcessVersion,
  haulPath: Point[],
): ProcessVersion {
  const path = clonePath(haulPath)
  if (path.length < 2) return process

  return {
    ...process,
    haulPathOverride: path,
    steps: process.steps.map((s) =>
      s.kind === 'haul' ? { ...s, haulPath: clonePath(path) } : s,
    ),
  }
}

/** Whether manufacture auto-moves the booster after each machine completes. */
export function resolveAutoMoveBooster(process: ProcessVersion): boolean {
  if (process.autoMoveBooster === true) return true
  return getManufactureStep(process)?.autoMoveBooster === true
}

/** Enable/disable booster auto-advance between manufacture stations (Round 2 redesign). */
export function applyAutoMoveBooster(
  process: ProcessVersion,
  enabled: boolean,
): ProcessVersion {
  return {
    ...process,
    autoMoveBooster: enabled,
    steps: process.steps.map((s) =>
      s.kind === 'manufacture' ? { ...s, autoMoveBooster: enabled } : s,
    ),
  }
}
