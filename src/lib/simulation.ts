import type {
  LeadTimeEntry,
  ProcessMachine,
  ProcessStep,
  ProcessVersion,
  RedesignCostBreakdown,
  RunState,
  SessionMetrics,
} from '../types/process'
import { LAUNCH_PREP_ACTIONS, MACHINE_DAMAGED_FAILURE_CHANCE } from '../types/process'
import { resolveLaunchSeqConfig } from './processEdit'

export function getActiveStep(
  process: ProcessVersion,
  run: RunState,
): ProcessStep | null {
  if (run.currentStepIndex < 0) return null
  return process.steps[run.currentStepIndex] ?? null
}

/** Machines for a manufacture step, sorted by operator sequence (1 → 2 → …). */
export function getStepMachines(step: ProcessStep | null): ProcessMachine[] {
  const machines = step?.machines ?? []
  return [...machines].sort((a, b) => a.sequence - b.sequence)
}

export function hasNextStep(
  process: ProcessVersion,
  run: RunState,
): boolean {
  return run.currentStepIndex >= 0 && run.currentStepIndex < process.steps.length - 1
}

/** Start a new round on the first process step. Resets and starts wall-clock lead time. */
export function beginRun(prev: RunState): RunState {
  return {
    ...prev,
    status: 'running',
    currentStepIndex: 0,
    nextMachineIndex: 0,
    activeMachineId: null,
    completedMachineIds: [],
    runStartedAt: Date.now(),
    runEndedAt: null,
    pausedAt: null,
    pausedMs: 0,
  }
}

/** True while the session timer is paused (process interactions locked). */
export function isPaused(run: RunState): boolean {
  return run.pausedAt != null
}

/** Pause the wall-clock timer. No-op if already paused. */
export function pauseRun(prev: RunState): RunState {
  if (prev.pausedAt != null) return prev
  return { ...prev, pausedAt: Date.now() }
}

/** Resume the wall-clock timer, folding the just-finished pause into pausedMs. No-op if not paused. */
export function resumeRun(prev: RunState): RunState {
  if (prev.pausedAt == null) return prev
  return {
    ...prev,
    pausedAt: null,
    pausedMs: prev.pausedMs + Math.max(0, Date.now() - prev.pausedAt),
  }
}

/**
 * Wall-clock elapsed ms for the current/last unit run, excluding any time
 * spent paused (both time already folded into pausedMs and any pause
 * currently open) — pausing the session stops the lead-time clock.
 */
export function wallClockMs(run: RunState, now = Date.now()): number | null {
  if (run.runStartedAt == null) return null
  const end = run.runEndedAt ?? now
  const openPauseMs = run.pausedAt != null ? Math.max(0, end - run.pausedAt) : 0
  return Math.max(0, end - run.runStartedAt - run.pausedMs - openPauseMs)
}

/**
 * Mark the unit fully complete and freeze the wall-clock lead-time timer.
 * Use from any final step finish handler (launch-sequence liftoff in baseline).
 */
export function completeUnitRun(
  prev: RunState,
  patch: Omit<Partial<RunState>, 'status' | 'runEndedAt' | 'completedRuns'> = {},
): RunState {
  return {
    ...prev,
    ...patch,
    status: 'complete',
    runEndedAt: Date.now(),
    completedRuns: prev.completedRuns + 1,
  }
}

/**
 * Operator clicked a machine. Only the next required machine is accepted.
 *
 * Damaged machines (as-is friction, repairable in To-be redesign) have a
 * MACHINE_DAMAGED_FAILURE_CHANCE chance of failing the click outright. The
 * roll happens here, up front, but the machine still plays out its
 * failed-attempt animation (approach → glow red → retreat — see
 * `failMachineWork`) rather than the click being a silent no-op. Once that
 * finishes, the operator must click Activate again, which is guaranteed to
 * succeed at half speed (`activeMachineHalfSpeed`).
 */
export function startMachineWork(
  process: ProcessVersion,
  prev: RunState,
  machineId: string,
): RunState {
  if (prev.status !== 'running') return prev

  const step = getActiveStep(process, prev)
  if (step?.kind !== 'manufacture') return prev

  const machines = getStepMachines(step)
  const required = machines[prev.nextMachineIndex]
  if (!required || required.id !== machineId) return prev

  const isRetry = prev.pendingRetryMachineId === machineId
  const willFail =
    !isRetry &&
    required.damaged === true &&
    Math.random() < MACHINE_DAMAGED_FAILURE_CHANCE

  return {
    ...prev,
    status: 'machine_working',
    activeMachineId: machineId,
    activeMachineWillFail: willFail,
    activeMachineHalfSpeed: isRetry,
    pendingRetryMachineId: null,
  }
}

/**
 * Called when a damaged machine's failed-attempt animation finishes
 * (approach → glow red → retreat). Never completes the machine — puts it
 * back to `running` with a pending retry, which `startMachineWork` will
 * then guarantee succeeds at half speed.
 */
export function failMachineWork(prev: RunState): RunState {
  if (
    prev.status !== 'machine_working' ||
    !prev.activeMachineId ||
    !prev.activeMachineWillFail
  ) {
    return prev
  }
  return {
    ...prev,
    status: 'running',
    pendingRetryMachineId: prev.activeMachineId,
    activeMachineId: null,
    activeMachineWillFail: false,
    activeMachineHalfSpeed: false,
  }
}

/**
 * Called when a machine's work animation finishes.
 * Completing the last machine of a manufacture step → step_complete
 * (does not finish the whole run if more steps remain).
 */
export function finishMachineWork(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (
    prev.status !== 'machine_working' ||
    !prev.activeMachineId ||
    prev.activeMachineWillFail
  ) {
    return prev
  }

  const step = getActiveStep(process, prev)
  const machines = getStepMachines(step)
  const machine = machines[prev.nextMachineIndex]
  if (!machine || machine.id !== prev.activeMachineId) return prev

  const completedMachineIds = [...prev.completedMachineIds, machine.id]
  const nextMachineIndex = prev.nextMachineIndex + 1
  const allDone = nextMachineIndex >= machines.length

  if (allDone) {
    return {
      ...prev,
      status: 'step_complete',
      activeMachineId: null,
      activeMachineHalfSpeed: false,
      nextMachineIndex,
      completedMachineIds,
    }
  }

  return {
    ...prev,
    status: 'running',
    activeMachineId: null,
    activeMachineHalfSpeed: false,
    nextMachineIndex,
    completedMachineIds,
  }
}

/** Move from a completed step into the next process step. */
export function proceedToNextStep(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (prev.status !== 'step_complete') return prev
  if (!hasNextStep(process, prev)) return prev

  const nextIndex = prev.currentStepIndex + 1
  const next = process.steps[nextIndex]
  if (!next) return prev

  return {
    ...prev,
    status: 'running',
    currentStepIndex: nextIndex,
    nextMachineIndex: 0,
    activeMachineId: null,
    completedMachineIds: [],
  }
}

/** Booster reached the pad — wait for explicit Mount to launch pad. */
export function markOnPad(prev: RunState): RunState {
  if (prev.status !== 'running') return prev
  return {
    ...prev,
    status: 'awaiting_reorient',
  }
}

/**
 * Operator mounted the booster to the launch pad — complete the haul step.
 * If this is the last process step, finishes the full unit run; otherwise
 * auto-advances into the next step (no Proceed click). Does not reset
 * wall-clock cycle time (`runStartedAt` / `runEndedAt` unchanged).
 */
export function completeHaulStep(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (prev.status !== 'awaiting_reorient') return prev

  const step = getActiveStep(process, prev)
  if (step?.kind !== 'haul') return prev

  const isLast = prev.currentStepIndex >= process.steps.length - 1

  if (isLast) {
    return completeUnitRun(prev)
  }

  // Auto-advance: seat complete → next step running (skip haul step_complete / Proceed).
  const nextIndex = prev.currentStepIndex + 1
  return {
    ...prev,
    status: 'running',
    currentStepIndex: nextIndex,
    nextMachineIndex: 0,
    activeMachineId: null,
    completedMachineIds: [],
  }
}

/**
 * Operator finished the next launch-prep sub-task (mate / crane / fuel / power).
 * Credits that action's time. Completing the last action finishes the step
 * (and the full unit run when this is the final process step).
 */
export function finishLaunchPrepAction(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (prev.status !== 'running') return prev

  const step = getActiveStep(process, prev)
  if (step?.kind !== 'launch-prep') return prev

  const action = LAUNCH_PREP_ACTIONS[prev.nextMachineIndex]
  if (!action) return prev

  const completedMachineIds = [...prev.completedMachineIds, action.id]
  const nextMachineIndex = prev.nextMachineIndex + 1
  const allDone = nextMachineIndex >= LAUNCH_PREP_ACTIONS.length

  if (allDone) {
    const isLast = prev.currentStepIndex >= process.steps.length - 1
    if (isLast) {
      return completeUnitRun(prev, {
        activeMachineId: null,
        nextMachineIndex,
        completedMachineIds,
      })
    }
    return {
      ...prev,
      status: 'step_complete',
      activeMachineId: null,
      nextMachineIndex,
      completedMachineIds,
    }
  }

  return {
    ...prev,
    status: 'running',
    activeMachineId: null,
    nextMachineIndex,
    completedMachineIds,
  }
}

/**
 * Operator finished the next launch-sequence action (GO / key / liftoff).
 * Completing the last action (liftoff) finishes the full unit run when this
 * is the final process step.
 *
 * Action list is derived from redesign config (removed GO stations shorten the
 * sequence; key/liftoff indices follow remaining stations).
 */
export function finishLaunchSequenceAction(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (prev.status !== 'running') return prev

  const step = getActiveStep(process, prev)
  if (step?.kind !== 'launch-sequence') return prev

  const { actions } = resolveLaunchSeqConfig(process)
  const action = actions[prev.nextMachineIndex]
  if (!action) return prev

  const completedMachineIds = [...prev.completedMachineIds, action.id]
  const nextMachineIndex = prev.nextMachineIndex + 1
  const allDone = nextMachineIndex >= actions.length

  if (allDone) {
    const isLast = prev.currentStepIndex >= process.steps.length - 1
    if (isLast) {
      return completeUnitRun(prev, {
        activeMachineId: null,
        nextMachineIndex,
        completedMachineIds,
      })
    }
    return {
      ...prev,
      status: 'step_complete',
      activeMachineId: null,
      nextMachineIndex,
      completedMachineIds,
    }
  }

  return {
    ...prev,
    status: 'running',
    activeMachineId: null,
    nextMachineIndex,
    completedMachineIds,
  }
}

/**
 * Live top-bar metrics.
 * @param now - Wall-clock ms for live lead time while a run is open (pass ticking Date.now()).
 */
export function metricsFromRun(run: RunState, now = Date.now()): SessionMetrics {
  const inProgress =
    run.status === 'running' ||
    run.status === 'machine_working' ||
    run.status === 'step_complete' ||
    run.status === 'awaiting_reorient' ||
    run.status === 'complete'

  if (!inProgress && run.completedRuns === 0 && run.runStartedAt == null) {
    return { leadTime: null }
  }

  const wallMs = wallClockMs(run, now)
  // Lead time: real end-to-end seconds from Run Process until launch complete.
  const leadTime = wallMs != null ? wallMs / 1000 : null

  return { leadTime }
}

/** Format wall-clock lead time (seconds) as m:ss. */
export function formatLeadTime(totalSeconds: number | null): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '—'
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/** Optional process metrics attached when logging a completed unit. */
export interface LeadTimeEntryExtras {
  /** Redesign cost breakdown (same for all launches if fixed at confirm). */
  costBreakdown?: RedesignCostBreakdown
  /** Orbital insertion height achieved on this launch, in miles. */
  heightAchievedMiles?: number
  /** Set when Capcom was removed — no numeric height for this launch. */
  heightStatus?: 'no-capcom'
  /** Times the booster exploded on the haul road during this launch. */
  defectCount?: number
}

/** Build a Data-tab board entry from a just-completed unit run. */
export function leadTimeEntryFromRun(
  run: RunState,
  extras?: LeadTimeEntryExtras,
): LeadTimeEntry | null {
  if (
    run.status !== 'complete' ||
    run.runStartedAt == null ||
    run.runEndedAt == null ||
    run.completedRuns < 1
  ) {
    return null
  }
  return {
    runNumber: run.completedRuns,
    durationMs: Math.max(0, run.runEndedAt - run.runStartedAt),
    completedAt: run.runEndedAt,
    ...(extras?.costBreakdown !== undefined
      ? { costBreakdown: extras.costBreakdown }
      : {}),
    ...(extras?.heightAchievedMiles !== undefined
      ? { heightAchievedMiles: extras.heightAchievedMiles }
      : {}),
    ...(extras?.heightStatus !== undefined
      ? { heightStatus: extras.heightStatus }
      : {}),
    ...(extras?.defectCount !== undefined
      ? { defectCount: extras.defectCount }
      : {}),
  }
}

/** True while a unit run is open and the wall-clock timer should tick. */
export function isRunTimerActive(run: RunState): boolean {
  return (
    run.runStartedAt != null &&
    run.runEndedAt == null &&
    run.status !== 'idle' &&
    run.status !== 'complete' &&
    run.pausedAt == null
  )
}
