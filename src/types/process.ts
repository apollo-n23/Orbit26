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
  isWaiting?: boolean
  isInventory?: boolean
  /** Ordered machines for manufacture steps. */
  machines?: ProcessMachine[]
  /**
   * Optional custom haul centerline (scene units). When omitted, use default HAUL_PATH.
   * Set in Round 2 redesign when the learner paints a road.
   */
  haulPath?: HaulPathPoint[]
  /**
   * Manufacture redesign: after a machine finishes work, the booster auto-moves
   * to the next required station (no drag). Off by default (as-is friction).
   */
  autoMoveBooster?: boolean
  /**
   * Launch-prep redesign: technology investments for this process version
   * (as many as the budget allows — not mutually exclusive).
   * Mirrors process.launchPrepTechs when set on the launch-prep step.
   */
  launchPrepTechs?: LaunchPrepTech[]
  /**
   * Launch-sequence redesign: GO station ids the learner realigned
   * (reduces as-is misalignment friction in play). Mirrors process.launchSeqRealignIds.
   */
  launchSeqRealignIds?: string[]
  /**
   * Launch-sequence redesign: GO station ids removed from the poll for this round
   * (e.g. Range Safety). Mirrors process.launchSeqRemovedIds.
   */
  launchSeqRemovedIds?: string[]
  /**
   * Launch-sequence redesign: launch key mechanism lubricated so the
   * hold-to-turn arming action is near-instant. Mirrors process.keyLubrication.
   */
  keyLubrication?: boolean
}

/**
 * Round 2 launch-prep technology investments. Not mutually exclusive — the
 * learner can select as many as the redesign budget allows.
 * - faster-pumps: LOX/RP-1 fill almost instantly
 * - auto-power: single master ON instead of sequential switches
 * - payload-drone: one-step drone stack replaces multi-step crane
 * - strongback-redesign: mate slider only needs to travel half as far
 */
export type LaunchPrepTech =
  | 'faster-pumps'
  | 'auto-power'
  | 'payload-drone'
  | 'strongback-redesign'

/**
 * Total cost of improvement for a Round 2 redesign, broken down by where it
 * comes from. Every category except `roadCost` is a one-way ratchet within a
 * redesign session — once an investment is ever selected it stays counted,
 * even if later toggled off. Only removing painted road tiles reduces the
 * total. Fixed on the process once the learner confirms the layout.
 */
export interface RedesignCostBreakdown {
  /** Manufacture: cost of every machine ever moved from its factory slot. */
  machineMoveCost: number
  /** Manufacture: one-time cost of the booster auto-transfer upgrade. */
  autoTransferCost: number
  /** Haul road: billable tiles × per-tile cost. The only reducible category. */
  roadCost: number
  /** Launch prep: sum of every pad technology ever selected this session. */
  launchPrepTechCost: number
  /** Launch sequence: cost of every GO station ever realigned. */
  goRealignCost: number
  /** Launch sequence: cost of removing Range Safety from the poll. */
  rangeRemovalCost: number
  /** Launch sequence: one-time cost of lubricating the launch key mechanism. */
  keyLubricationCost: number
  /** Sum of all categories above. */
  total: number
}

export interface ProcessVersion {
  id: string
  name: string
  version: number
  steps: ProcessStep[]
  /**
   * Optional round-redesign haul centerline (scene units).
   * Preferred over step.haulPath when resolving the road for play.
   * Set when the learner confirms a painted road in Round 2 redesign.
   */
  haulPathOverride?: HaulPathPoint[]
  /**
   * Total cost of improvement from Round 2 redesign choices, broken down by
   * source. Fixed for the round once confirmed.
   */
  costBreakdown?: RedesignCostBreakdown
  /**
   * Process-level copy of manufacture auto-move upgrade (mirrors step flag for easy resolve).
   */
  autoMoveBooster?: boolean
  /**
   * Launch-prep technology investments chosen in Round 2 redesign — as many
   * as the redesign budget allows; not mutually exclusive.
   */
  launchPrepTechs?: LaunchPrepTech[]
  /**
   * Launch-sequence redesign (Round 2): GO station ids marked realigned.
   * Ids match LAUNCH_SEQ_GO_STATIONS[].id (e.g. 'go-guidance').
   * Play should reduce as-is misalignment friction for these stations.
   * Prefer process-level; may also be mirrored on the launch-sequence step.
   */
  launchSeqRealignIds?: string[]
  /**
   * Launch-sequence redesign (Round 2): GO station ids removed from the GO poll.
   * Only Range Safety (`go-range`) is offered for deletion in redesign UI;
   * field is a list so play can filter generically.
   * Prefer process-level; may also be mirrored on the launch-sequence step.
   */
  launchSeqRemovedIds?: string[]
  /**
   * Launch-sequence redesign (Round 2): launch key mechanism lubricated so
   * the hold-to-turn arming action is near-instant instead of a long hold.
   */
  keyLubrication?: boolean
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
  /**
   * Total cost of improvement breakdown for the process used on this run.
   * Same value for all launches in a redesign round when cost is fixed at confirm.
   */
  costBreakdown?: RedesignCostBreakdown
  /** Orbital insertion height achieved on this launch, in miles (randomised per launch). */
  heightAchievedMiles?: number
  /**
   * Number of times the booster exploded off the haul road (process step 2)
   * during this launch, before it reached the pad.
   */
  defectCount?: number
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
   * Wall-clock start of this unit run (`Date.now()`).
   * Set on Run Process / `beginRun`; null when idle with no active unit.
   */
  runStartedAt: number | null
  /**
   * Wall-clock end when the unit reaches `complete` (final step finished).
   * Null while the run is in progress; freezes the lead-time display.
   */
  runEndedAt: number | null
  completedRuns: number
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
  runStartedAt: null,
  runEndedAt: null,
  completedRuns: 0,
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

/** Ordered operator actions for the launch-prep step. */
export interface LaunchPrepAction {
  id: string
  name: string
}

/**
 * Sub-tasks for Prepare for launch:
 * mate → crane payload → fuel → power-up.
 */
export const LAUNCH_PREP_ACTIONS: LaunchPrepAction[] = [
  { id: 'mate-tower', name: 'Mate booster to tower' },
  { id: 'crane-payload', name: 'Stack payload with crane' },
  { id: 'fuel-vehicle', name: 'Fuel the vehicle' },
  { id: 'power-up', name: 'Power up for launch' },
]

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

/** Range Safety station id — only station redesign allows removing from the GO poll. */
export const LAUNCH_SEQ_RANGE_STATION_ID = 'go-range'
