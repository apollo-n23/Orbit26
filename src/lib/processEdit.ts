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

/**
 * Persist a redesigned haul centerline on the process (step + version override).
 * Optional `roadCost` is the construction metric from painted billable tiles.
 */
export function applyHaulPath(
  process: ProcessVersion,
  haulPath: Point[],
  roadCost?: number,
): ProcessVersion {
  const path = clonePath(haulPath)
  if (path.length < 2) return process

  return {
    ...process,
    haulPathOverride: path,
    ...(roadCost !== undefined ? { roadCost } : {}),
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

const LAUNCH_PREP_TECH_IDS = new Set<string>(
  LAUNCH_PREP_TECH_OPTIONS.map((o) => o.id),
)

/** True when value is a known Round 2 launch-prep investment id. */
export function isLaunchPrepTech(value: unknown): value is LaunchPrepTech {
  return typeof value === 'string' && LAUNCH_PREP_TECH_IDS.has(value)
}

/**
 * Resolve the launch-prep technology for play:
 * process.launchPrepTech → launch-prep step.launchPrepTech → null.
 * Invalid / cleared values do not fall through as a false positive.
 */
export function resolveLaunchPrepTech(
  process: ProcessVersion,
): LaunchPrepTech | null {
  if (isLaunchPrepTech(process.launchPrepTech)) return process.launchPrepTech
  // Explicit null on the version means "cleared in redesign" — do not use step.
  if (process.launchPrepTech === null) return null
  const step = process.steps.find((s) => s.kind === 'launch-prep')
  if (isLaunchPrepTech(step?.launchPrepTech)) return step.launchPrepTech
  return null
}

/** Set or clear the single launch-prep technology investment (Round 2 redesign). */
export function applyLaunchPrepTech(
  process: ProcessVersion,
  tech: LaunchPrepTech | null,
): ProcessVersion {
  const nextTech = tech != null && isLaunchPrepTech(tech) ? tech : null
  return {
    ...process,
    launchPrepTech: nextTech,
    steps: process.steps.map((s) => {
      if (s.kind !== 'launch-prep') return s
      const { launchPrepTech: _prev, ...rest } = s
      return nextTech ? { ...rest, launchPrepTech: nextTech } : rest
    }),
  }
}
