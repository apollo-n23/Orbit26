import type {
  HaulPathPoint,
  LaunchPrepAction,
  LaunchPrepTech,
  LaunchSeqGoStation,
  ProcessMachine,
  ProcessStep,
  ProcessVersion,
} from '../types/process'
import {
  LAUNCH_SEQ_GO_STATIONS,
  LAUNCH_SEQ_RANGE_STATION_ID,
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

export function getLaunchSeqStep(
  process: ProcessVersion,
): ProcessStep | undefined {
  return process.steps.find((s) => s.kind === 'launch-sequence')
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

// ---------------------------------------------------------------------------
// Launch-sequence redesign (Round 2): GO realign + optional Range deletion
// ---------------------------------------------------------------------------

const LAUNCH_SEQ_STATION_IDS = new Set(
  LAUNCH_SEQ_GO_STATIONS.map((s) => s.id),
)

function isLaunchSeqStationId(id: string): boolean {
  return LAUNCH_SEQ_STATION_IDS.has(id)
}

function normalizeStationIdList(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    if (typeof raw !== 'string' || !isLaunchSeqStationId(raw)) continue
    if (seen.has(raw)) continue
    seen.add(raw)
    out.push(raw)
  }
  return out
}

/**
 * GO station ids marked realigned for this process.
 * Prefer process.launchSeqRealignIds; fall back to launch-sequence step.
 */
export function resolveLaunchSeqRealignIds(process: ProcessVersion): string[] {
  if (Array.isArray(process.launchSeqRealignIds)) {
    return normalizeStationIdList(process.launchSeqRealignIds)
  }
  return normalizeStationIdList(getLaunchSeqStep(process)?.launchSeqRealignIds)
}

/**
 * GO station ids removed from the poll for this process.
 * Prefer process.launchSeqRemovedIds; fall back to launch-sequence step.
 */
export function resolveLaunchSeqRemovedIds(process: ProcessVersion): string[] {
  if (Array.isArray(process.launchSeqRemovedIds)) {
    return normalizeStationIdList(process.launchSeqRemovedIds)
  }
  return normalizeStationIdList(getLaunchSeqStep(process)?.launchSeqRemovedIds)
}

/** True when the station is currently marked realigned. */
export function isLaunchSeqStationRealigned(
  process: ProcessVersion,
  stationId: string,
): boolean {
  return resolveLaunchSeqRealignIds(process).includes(stationId)
}

/** True when the station is removed from the GO list for this process. */
export function isLaunchSeqStationRemoved(
  process: ProcessVersion,
  stationId: string,
): boolean {
  return resolveLaunchSeqRemovedIds(process).includes(stationId)
}

/**
 * Persist realign + removed lists on the process version and launch-sequence step.
 * Filters unknown ids and drops realign marks for stations that are removed.
 */
export function applyLaunchSeqRedesign(
  process: ProcessVersion,
  realignIds: string[],
  removedIds: string[],
): ProcessVersion {
  const removed = normalizeStationIdList(removedIds)
  const removedSet = new Set(removed)
  // Realigning a deleted station is meaningless — keep lists consistent.
  const realign = normalizeStationIdList(realignIds).filter(
    (id) => !removedSet.has(id),
  )

  return {
    ...process,
    launchSeqRealignIds: realign,
    launchSeqRemovedIds: removed,
    steps: process.steps.map((s) => {
      if (s.kind !== 'launch-sequence') return s
      return {
        ...s,
        launchSeqRealignIds: [...realign],
        launchSeqRemovedIds: [...removed],
      }
    }),
  }
}

/** Toggle a GO station as realigned (no-op if the station is removed). */
export function applyLaunchSeqRealign(
  process: ProcessVersion,
  stationId: string,
  realigned: boolean,
): ProcessVersion {
  if (!isLaunchSeqStationId(stationId)) return process
  const removed = resolveLaunchSeqRemovedIds(process)
  if (removed.includes(stationId)) return process
  const current = new Set(resolveLaunchSeqRealignIds(process))
  if (realigned) current.add(stationId)
  else current.delete(stationId)
  return applyLaunchSeqRedesign(process, [...current], removed)
}

/**
 * Remove or restore a GO station from the sequence.
 * Redesign UI only offers this for Range Safety (`go-range`); helper accepts any
 * known station id for play/tests.
 */
export function applyLaunchSeqRemove(
  process: ProcessVersion,
  stationId: string,
  removed: boolean,
): ProcessVersion {
  if (!isLaunchSeqStationId(stationId)) return process
  const realign = resolveLaunchSeqRealignIds(process)
  const current = new Set(resolveLaunchSeqRemovedIds(process))
  if (removed) current.add(stationId)
  else current.delete(stationId)
  return applyLaunchSeqRedesign(process, realign, [...current])
}

/** Convenience: delete Range Safety from the GO poll (Round 2 redesign). */
export function applyLaunchSeqRemoveRange(
  process: ProcessVersion,
  removed: boolean = true,
): ProcessVersion {
  return applyLaunchSeqRemove(process, LAUNCH_SEQ_RANGE_STATION_ID, removed)
}

/**
 * Resolved launch-sequence play config from redesign fields.
 * Round 1 / unset fields → full baseline GO list, no realign (as-is friction).
 */
export interface ResolvedLaunchSeqConfig {
  /** GO stations still in the poll (baseline order; removed filtered out). */
  goStations: LaunchSeqGoStation[]
  /** Station ids among goStations rendered without staggered/misaligned CSS. */
  realignedGoIds: ReadonlySet<string>
  /** Full action list: remaining GOs → key-arm → liftoff. */
  actions: LaunchPrepAction[]
  /** Index of key-arm within `actions`. */
  keyIndex: number
  /** Index of liftoff within `actions`. */
  liftoffIndex: number
}

/** Build ordered launch-sequence actions from the active GO station list. */
export function buildLaunchSeqActions(
  goStations: LaunchSeqGoStation[],
): LaunchPrepAction[] {
  return [
    ...goStations.map((s) => ({
      id: s.id,
      name: `${s.name} — GO`,
      workTime: 2,
      valueAddRatio: 0.25,
    })),
    {
      id: 'key-arm',
      name: 'Arm launch key',
      workTime: 5,
      valueAddRatio: 0.4,
    },
    {
      id: 'liftoff',
      name: 'Liftoff',
      workTime: 10,
      valueAddRatio: 0.95,
    },
  ]
}

/**
 * Resolve launch-sequence config for play from process redesign fields.
 * Prefer process.launchSeqRemovedIds / launchSeqRealignIds (with step fallback).
 */
export function resolveLaunchSeqConfig(
  process: ProcessVersion,
): ResolvedLaunchSeqConfig {
  const removed = new Set(resolveLaunchSeqRemovedIds(process))
  const goStations = LAUNCH_SEQ_GO_STATIONS.filter((s) => !removed.has(s.id))
  const remainingIds = new Set(goStations.map((s) => s.id))
  const realignedGoIds = new Set(
    resolveLaunchSeqRealignIds(process).filter((id) => remainingIds.has(id)),
  )
  const actions = buildLaunchSeqActions(goStations)
  return {
    goStations,
    realignedGoIds,
    actions,
    keyIndex: goStations.length,
    liftoffIndex: goStations.length + 1,
  }
}

/**
 * Operational criticality copy for each baseline GO station (redesign info panel).
 * Keys are LAUNCH_SEQ_GO_STATIONS ids.
 */
export const LAUNCH_SEQ_STATION_CRITICALITY: Record<string, string> = {
  'go-guidance':
    'Confirms navigation and flight-path computers are ready. A NO-GO here can scrub the attempt — high impact on mission progress.',
  'go-capcom':
    'Communications bridge to the vehicle and crew procedures. Holds up the poll until voice/data links are clear.',
  'go-propulsion':
    'Propellant state and engine readiness. Critical for commit-to-launch; misalignment here burns wall-clock before you can arm the key.',
  'go-avionics':
    'Flight computers, telemetry, and vehicle power health. Required for a safe GO chain; slow clearances stack delay into the sequence.',
  'go-range':
    'Range Safety is a traditional GO call, but it is not actually required for this launch. You may delete it from the sequence to remove a non-value poll step.',
  'go-weather':
    'Pad weather and upper-winds constraints. Can hold the poll when conditions are marginal; realigning reduces friction on clear days.',
}
