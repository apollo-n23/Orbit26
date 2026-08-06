import type {
  HaulPathPoint,
  LaunchPrepTech,
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

export function resolveLaunchPrepTech(
  process: ProcessVersion,
): LaunchPrepTech | null {
  if (process.launchPrepTech) return process.launchPrepTech
  const step = process.steps.find((s) => s.kind === 'launch-prep')
  return step?.launchPrepTech ?? null
}

/** Set or clear the single launch-prep technology investment (Round 2 redesign). */
export function applyLaunchPrepTech(
  process: ProcessVersion,
  tech: LaunchPrepTech | null,
): ProcessVersion {
  return {
    ...process,
    launchPrepTech: tech,
    steps: process.steps.map((s) =>
      s.kind === 'launch-prep' ? { ...s, launchPrepTech: tech ?? undefined } : s,
    ),
  }
}

export const LAUNCH_PREP_TECH_OPTIONS: {
  id: LaunchPrepTech
  name: string
  summary: string
}[] = [
  {
    id: 'faster-pumps',
    name: 'Faster fuel pumps',
    summary:
      'High-flow LOX/RP-1 pumps fill both tanks almost instantly once umbilicals are connected.',
  },
  {
    id: 'auto-power',
    name: 'Automatic power-up sequence',
    summary:
      'A single master ON arms avionics, flight computers, telemetry, and range safety together.',
  },
  {
    id: 'payload-drone',
    name: 'Autonomous payload drone',
    summary:
      'Replaces the multi-step pad crane with a drone that seats the payload on the stack in one action.',
  },
]
