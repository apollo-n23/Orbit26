import type {
  ProcessMachine,
  ProcessStep,
  ProcessVersion,
  RunState,
  SessionMetrics,
} from '../types/process'
import { HAUL_STEP_TIME, LAUNCH_PREP_ACTIONS } from '../types/process'

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

/** Start a new round on the first process step. */
export function beginRun(prev: RunState): RunState {
  return {
    ...prev,
    status: 'running',
    currentStepIndex: 0,
    nextMachineIndex: 0,
    activeMachineId: null,
    completedMachineIds: [],
    elapsedTime: 0,
    valueAddTime: 0,
    unitDefective: false,
  }
}

/**
 * Operator clicked a machine. Only the next required machine is accepted.
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

  return {
    ...prev,
    status: 'machine_working',
    activeMachineId: machineId,
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
  if (prev.status !== 'machine_working' || !prev.activeMachineId) return prev

  const step = getActiveStep(process, prev)
  const machines = getStepMachines(step)
  const machine = machines[prev.nextMachineIndex]
  if (!machine || machine.id !== prev.activeMachineId) return prev

  const completedMachineIds = [...prev.completedMachineIds, machine.id]
  const nextMachineIndex = prev.nextMachineIndex + 1
  const elapsedTime = prev.elapsedTime + machine.workTime
  const valueAddTime = prev.valueAddTime + machine.workTime
  const allDone = nextMachineIndex >= machines.length

  if (allDone) {
    return {
      ...prev,
      status: 'step_complete',
      activeMachineId: null,
      nextMachineIndex,
      completedMachineIds,
      elapsedTime,
      valueAddTime,
    }
  }

  return {
    ...prev,
    status: 'running',
    activeMachineId: null,
    nextMachineIndex,
    completedMachineIds,
    elapsedTime,
    valueAddTime,
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

/** Booster reached the pad — wait for explicit reorient. */
export function markOnPad(prev: RunState): RunState {
  if (prev.status !== 'running') return prev
  return {
    ...prev,
    status: 'awaiting_reorient',
  }
}

/**
 * Operator reoriented on the pad — complete the haul step.
 * If this is the last process step, finishes the full unit run; otherwise
 * enters step_complete so the learner can proceed.
 */
export function completeHaulStep(
  process: ProcessVersion,
  prev: RunState,
): RunState {
  if (prev.status !== 'awaiting_reorient') return prev

  const step = getActiveStep(process, prev)
  if (step?.kind !== 'haul') return prev

  const elapsedTime = prev.elapsedTime + HAUL_STEP_TIME
  // Haul is mostly non-value-add transport in lean terms; credit a small VA slice.
  const valueAddTime = prev.valueAddTime + Math.round(HAUL_STEP_TIME * 0.15)
  const isLast = prev.currentStepIndex >= process.steps.length - 1

  if (isLast) {
    return {
      ...prev,
      status: 'complete',
      elapsedTime,
      valueAddTime,
      completedRuns: prev.completedRuns + 1,
      goodRuns: prev.goodRuns + (prev.unitDefective ? 0 : 1),
    }
  }

  return {
    ...prev,
    status: 'step_complete',
    elapsedTime,
    valueAddTime,
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
  const elapsedTime = prev.elapsedTime + action.workTime
  const valueAddTime =
    prev.valueAddTime + Math.round(action.workTime * action.valueAddRatio)
  const allDone = nextMachineIndex >= LAUNCH_PREP_ACTIONS.length

  if (allDone) {
    const isLast = prev.currentStepIndex >= process.steps.length - 1
    if (isLast) {
      return {
        ...prev,
        status: 'complete',
        activeMachineId: null,
        nextMachineIndex,
        completedMachineIds,
        elapsedTime,
        valueAddTime,
        completedRuns: prev.completedRuns + 1,
        goodRuns: prev.goodRuns + (prev.unitDefective ? 0 : 1),
      }
    }
    return {
      ...prev,
      status: 'step_complete',
      activeMachineId: null,
      nextMachineIndex,
      completedMachineIds,
      elapsedTime,
      valueAddTime,
    }
  }

  return {
    ...prev,
    status: 'running',
    activeMachineId: null,
    nextMachineIndex,
    completedMachineIds,
    elapsedTime,
    valueAddTime,
  }
}

export function metricsFromRun(run: RunState): SessionMetrics {
  const inProgress =
    run.status === 'running' ||
    run.status === 'machine_working' ||
    run.status === 'step_complete' ||
    run.status === 'awaiting_reorient' ||
    run.status === 'complete'

  if (!inProgress && run.completedRuns === 0) {
    return { cycleTime: null, yield: null, flowEfficiency: null }
  }

  const cycleTime =
    run.elapsedTime > 0 || inProgress ? run.elapsedTime : null

  const flowEfficiency =
    cycleTime != null && cycleTime > 0
      ? (run.valueAddTime / cycleTime) * 100
      : inProgress
        ? 0
        : null

  const yieldPct =
    run.completedRuns > 0
      ? (run.goodRuns / run.completedRuns) * 100
      : inProgress
        ? run.unitDefective
          ? 0
          : 100
        : null

  return {
    cycleTime,
    yield: yieldPct,
    flowEfficiency,
  }
}

export function formatMetric(value: number | null, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}
