/** Machine / station the operator must trigger inside a manufacture step. */
export interface ProcessMachine {
  id: string
  /** 1-based sequence order the operator must follow (1 → 2 → 3 → 4). */
  sequence: number
  /**
   * Physical left-to-right slot on the production line (0 = leftmost).
   * May differ from sequence so the booster travels forward/back between stops.
   */
  linePosition: number
  name: string
  kind: 'robot-arm' | 'welder' | 'laser'
  /** Simulated work time added to cycle time (minutes). */
  workTime: number
}

export type ProcessStepKind = 'manufacture' | 'haul'

/** A single step in the value stream. */
export interface ProcessStep {
  id: string
  name: string
  kind: ProcessStepKind
  /** Nominal total time for the step. */
  baseTime: number
  defectProbability: number
  isWaiting?: boolean
  isInventory?: boolean
  /** Ordered machines for manufacture steps. */
  machines?: ProcessMachine[]
}

export interface ProcessVersion {
  id: string
  name: string
  version: number
  steps: ProcessStep[]
}

export interface SessionMetrics {
  cycleTime: number | null
  yield: number | null
  flowEfficiency: number | null
}

/**
 * Lifecycle of one simulation round.
 * - running: interact with current step
 * - machine_working: manufacture machine animating
 * - step_complete: current step done; may proceed if more steps remain
 * - awaiting_reorient: haul booster is on the pad; operator must reorient
 * - complete: all process steps finished for this unit
 */
export type RunStatus =
  | 'idle'
  | 'running'
  | 'machine_working'
  | 'step_complete'
  | 'awaiting_reorient'
  | 'complete'

export interface RunState {
  status: RunStatus
  /** Index into process.steps for the active process step. */
  currentStepIndex: number
  /**
   * Index into the current step's machines that the user must click next.
   * Equal to machines.length when all machines for the step are done.
   */
  nextMachineIndex: number
  /** Machine currently playing its work animation, if any. */
  activeMachineId: string | null
  /** Machine ids finished this step. */
  completedMachineIds: string[]
  elapsedTime: number
  valueAddTime: number
  unitDefective: boolean
  completedRuns: number
  goodRuns: number
}

export const MAX_RUNS_PER_SESSION = 12

export const EMPTY_METRICS: SessionMetrics = {
  cycleTime: null,
  yield: null,
  flowEfficiency: null,
}

export const INITIAL_RUN_STATE: RunState = {
  status: 'idle',
  currentStepIndex: -1,
  nextMachineIndex: 0,
  activeMachineId: null,
  completedMachineIds: [],
  elapsedTime: 0,
  valueAddTime: 0,
  unitDefective: false,
  completedRuns: 0,
  goodRuns: 0,
}

/** Machine slides from parked offset toward the production line (ms). */
export const MACHINE_APPROACH_MS = 750

/** Work animation length while the machine is on the booster (ms). */
export const MACHINE_WORK_MS = 1100

/** Machine returns from the line to its parked position (ms). */
export const MACHINE_RETREAT_MS = 750

/**
 * Full operate cycle: approach → work → retreat.
 * Used by SimulationView before finishMachineWork unlocks the next sequence.
 */
export const MACHINE_CYCLE_MS =
  MACHINE_APPROACH_MS + MACHINE_WORK_MS + MACHINE_RETREAT_MS

/** Booster travel between station stops along the belt (ms). */
export const BOOSTER_TRAVEL_MS = 850

/** Time credited when the haul step is completed (minutes). */
export const HAUL_STEP_TIME = 35
