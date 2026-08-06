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
  /**
   * Extra vertical park distance from the production line (rem).
   * Larger values park further from the belt; approach travels that distance to the line.
   */
  parkOffset: number
  /**
   * Four-digit station access code the operator must enter before Activate is offered.
   * Displayed in the manufacture access-code banner for the current required station.
   */
  accessCode: string
}

export type ProcessStepKind =
  | 'manufacture'
  | 'haul'
  | 'launch-prep'
  | 'launch-sequence'

/** Point in haul scene units (matches pathGeometry SCENE_*). */
export interface HaulPathPoint {
  x: number
  y: number
}

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
  /**
   * Optional custom haul centerline (scene units). When omitted, use default HAUL_PATH.
   * Set in Round 2 redesign when the learner paints a road.
   */
  haulPath?: HaulPathPoint[]
}

export interface ProcessVersion {
  id: string
  name: string
  version: number
  steps: ProcessStep[]
}

export interface SessionMetrics {
  /**
   * Wall-clock lead time for the current (or last completed) unit run, in seconds.
   * End-to-end process time from Run Process through launch. Display as m:ss.
   */
  leadTime: number | null
}

/**
 * One completed full unit run (all process steps) for the Data tab lead-time board.
 * Like a motorsport lap: each full assembly→launch cycle logs one entry.
 */
export interface LeadTimeEntry {
  /** 1-based run number within the session (matches completedRuns at log time). */
  runNumber: number
  /** Wall-clock duration of the full process, milliseconds. */
  durationMs: number
  /** `Date.now()` when the unit completed (launch finished). */
  completedAt: number
}

/**
 * Lifecycle of one simulation round.
 * - running: interact with current step
 * - machine_working: manufacture machine animating
 * - step_complete: current step done; may proceed if more steps remain
 * - awaiting_reorient: haul booster is on the pad; operator must Mount to launch pad
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
  /**
   * Accumulated process work time (simulated minutes) for flow-efficiency math.
   * Not used for top-bar Lead Time — that uses wall-clock timestamps.
   */
  elapsedTime: number
  /** Value-add slice of process work time (simulated minutes). */
  valueAddTime: number
  /**
   * Wall-clock start of this unit run (`Date.now()`).
   * Set on Run Process / `beginRun`; null when idle with no active unit.
   */
  runStartedAt: number | null
  /**
   * Wall-clock end when the unit reaches `complete` (final step finished).
   * Null while the run is in progress; freezes the lead-time display.
   */
  runEndedAt: number | null
  unitDefective: boolean
  completedRuns: number
  goodRuns: number
}

/**
 * Max full unit launches per learning round (assembly → liftoff).
 * Prefer ROCKETS_PER_ROUND from types/round.ts in new code.
 */
export const MAX_RUNS_PER_SESSION = 3

export const EMPTY_METRICS: SessionMetrics = {
  leadTime: null,
}

export const INITIAL_RUN_STATE: RunState = {
  status: 'idle',
  currentStepIndex: -1,
  nextMachineIndex: 0,
  activeMachineId: null,
  completedMachineIds: [],
  elapsedTime: 0,
  valueAddTime: 0,
  runStartedAt: null,
  runEndedAt: null,
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

/** Snap / settle animation when the booster is dropped on a station stop (ms). */
export const BOOSTER_TRAVEL_MS = 850

/** Time credited when the haul step is completed (minutes). */
export const HAUL_STEP_TIME = 35

/** Ordered operator actions for the launch-prep step. */
export interface LaunchPrepAction {
  id: string
  name: string
  /** Simulated work time added to cycle time (minutes). */
  workTime: number
  /** Fraction of workTime counted as value-add (0–1). */
  valueAddRatio: number
}

/**
 * Sub-tasks for Prepare for launch:
 * mate → crane payload → fuel → power-up.
 */
export const LAUNCH_PREP_ACTIONS: LaunchPrepAction[] = [
  {
    id: 'mate-tower',
    name: 'Mate booster to tower',
    workTime: 12,
    valueAddRatio: 0.75,
  },
  {
    id: 'crane-payload',
    name: 'Stack payload with crane',
    workTime: 14,
    valueAddRatio: 0.85,
  },
  {
    id: 'fuel-vehicle',
    name: 'Fuel the vehicle',
    workTime: 16,
    valueAddRatio: 0.45,
  },
  {
    id: 'power-up',
    name: 'Power up for launch',
    workTime: 10,
    valueAddRatio: 0.7,
  },
]

/** Nominal total time for launch-prep (sum of action work times). */
export const LAUNCH_PREP_STEP_TIME = LAUNCH_PREP_ACTIONS.reduce(
  (sum, a) => sum + a.workTime,
  0,
)

/**
 * Mission-control GO stations for the launch-sequence step.
 * Operator must clear each station in order before arming the key.
 */
export interface LaunchSeqGoStation {
  id: string
  /** Short console label (e.g. GUIDANCE). */
  callsign: string
  /** Human-readable station name. */
  name: string
}

export const LAUNCH_SEQ_GO_STATIONS: LaunchSeqGoStation[] = [
  { id: 'go-guidance', callsign: 'GUIDANCE', name: 'Guidance' },
  { id: 'go-capcom', callsign: 'CAPCOM', name: 'Capcom' },
  { id: 'go-propulsion', callsign: 'PROPULSION', name: 'Fuel / Propulsion' },
  { id: 'go-avionics', callsign: 'AVIONICS', name: 'Avionics' },
  { id: 'go-range', callsign: 'RANGE', name: 'Range Safety' },
  { id: 'go-weather', callsign: 'WEATHER', name: 'Weather' },
]

/**
 * Ordered actions for launch-sequence:
 * sequential GO calls → key arm → liftoff.
 * Reuses run nextMachineIndex / completedMachineIds for progress.
 */
export const LAUNCH_SEQ_ACTIONS: LaunchPrepAction[] = [
  ...LAUNCH_SEQ_GO_STATIONS.map((s) => ({
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

/** Nominal total time for launch-sequence (sum of action work times). */
export const LAUNCH_SEQ_STEP_TIME = LAUNCH_SEQ_ACTIONS.reduce(
  (sum, a) => sum + a.workTime,
  0,
)

/** Index of the key-arm action within LAUNCH_SEQ_ACTIONS. */
export const LAUNCH_SEQ_KEY_INDEX = LAUNCH_SEQ_GO_STATIONS.length

/** Index of the liftoff action within LAUNCH_SEQ_ACTIONS. */
export const LAUNCH_SEQ_LIFTOFF_INDEX = LAUNCH_SEQ_KEY_INDEX + 1
