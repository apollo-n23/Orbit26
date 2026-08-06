import { useEffect, useMemo } from 'react'
import { ManufactureScene } from '../components/ManufactureScene'
import { IntegratePayloadScene } from '../components/IntegratePayloadScene'
import { LaunchPrepScene } from '../components/LaunchPrepScene'
import { LaunchSequenceScene } from '../components/LaunchSequenceScene'
import type { ProcessVersion, RunState } from '../types/process'
import {
  LAUNCH_PREP_ACTIONS,
  LAUNCH_SEQ_ACTIONS,
  LAUNCH_SEQ_GO_STATIONS,
  LAUNCH_SEQ_KEY_INDEX,
  LAUNCH_SEQ_LIFTOFF_INDEX,
  MACHINE_CYCLE_MS,
  MAX_RUNS_PER_SESSION,
} from '../types/process'
import {
  getActiveStep,
  getStepMachines,
  hasNextStep,
} from '../lib/simulation'

interface SimulationViewProps {
  process: ProcessVersion
  run: RunState
  sessionActive: boolean
  /** Launches required this round (default MAX_RUNS_PER_SESSION). */
  maxRuns?: number
  roundTitle?: string
  onRunProcess: () => void
  onMachineClick: (machineId: string) => void
  onMachineWorkFinished: () => void
  onProceedToNextStep: () => void
  onReachedPad: () => void
  onHaulMountToPad: () => void
  onLaunchPrepActionComplete: () => void
  onLaunchSequenceActionComplete: () => void
}

export function SimulationView({
  process,
  run,
  sessionActive,
  maxRuns = MAX_RUNS_PER_SESSION,
  roundTitle,
  onRunProcess,
  onMachineClick,
  onMachineWorkFinished,
  onProceedToNextStep,
  onReachedPad,
  onHaulMountToPad,
  onLaunchPrepActionComplete,
  onLaunchSequenceActionComplete,
}: SimulationViewProps) {
  const runsRemaining = maxRuns - run.completedRuns
  const canRun =
    sessionActive &&
    (run.status === 'idle' || run.status === 'complete') &&
    runsRemaining > 0

  const step = getActiveStep(process, run)
  const machines = useMemo(() => getStepMachines(step), [step])
  const required = machines[run.nextMachineIndex]
  const inActiveRun =
    sessionActive &&
    run.status !== 'idle' &&
    run.currentStepIndex >= 0

  const showManufacture =
    inActiveRun &&
    step?.kind === 'manufacture' &&
    (run.status === 'running' ||
      run.status === 'machine_working' ||
      run.status === 'step_complete')

  const showHaul =
    inActiveRun &&
    step?.kind === 'haul' &&
    (run.status === 'running' ||
      run.status === 'awaiting_reorient' ||
      run.status === 'complete' ||
      run.status === 'step_complete')

  const showLaunchPrep =
    inActiveRun &&
    step?.kind === 'launch-prep' &&
    (run.status === 'running' ||
      run.status === 'step_complete' ||
      run.status === 'complete')

  const showLaunchSequence =
    inActiveRun &&
    step?.kind === 'launch-sequence' &&
    (run.status === 'running' ||
      run.status === 'step_complete' ||
      run.status === 'complete')

  const showManufactureProceed =
    run.status === 'step_complete' &&
    step?.kind === 'manufacture' &&
    hasNextStep(process, run)

  // Haul auto-advances to the next step on mount — no Proceed button.

  const showLaunchPrepProceed =
    run.status === 'step_complete' &&
    step?.kind === 'launch-prep' &&
    hasNextStep(process, run)

  useEffect(() => {
    if (run.status !== 'machine_working') return

    // Full cycle: machine approaches line → works → retreats, then unlock next.
    const id = window.setTimeout(() => {
      onMachineWorkFinished()
    }, MACHINE_CYCLE_MS)

    return () => window.clearTimeout(id)
  }, [run.status, run.activeMachineId, onMachineWorkFinished])

  function statusMessage(): string {
    if (!sessionActive) {
      return 'Start a session to begin manufacturing.'
    }
    if (run.status === 'idle') {
      return 'Click Run Process to place a booster on the production line.'
    }
    if (step?.kind === 'manufacture') {
      if (run.status === 'running' && required) {
        return `Drag the booster to station ${required.sequence} (${required.name}), enter access code ${required.accessCode} from the banner, then Activate (${required.sequence} of ${machines.length}).`
      }
      if (run.status === 'machine_working' && run.activeMachineId) {
        const active = machines.find((m) => m.id === run.activeMachineId)
        return `${active?.name ?? 'Machine'} approaches the line, works the booster, then returns to park…`
      }
      if (run.status === 'step_complete') {
        return hasNextStep(process, run)
          ? 'Manufacture complete. Proceed to Integrate payload.'
          : 'Manufacture complete.'
      }
    }
    if (step?.kind === 'haul') {
      if (run.status === 'running') {
        return 'Use arrow keys to move the booster along the road from Assembly to the Launch Pad. Stay on the road (assembly and pad are safe); pure grass explodes and resets. Use re-orient controls at corners (drag optional).'
      }
      if (run.status === 'awaiting_reorient') {
        return 'Booster is on the pad. Click Mount to launch pad to seat it and continue to launch preparation.'
      }
    }
    if (step?.kind === 'launch-prep') {
      if (run.status === 'running') {
        const action = LAUNCH_PREP_ACTIONS[run.nextMachineIndex]
        if (action) {
          return `Launch pad: ${action.name} (${run.nextMachineIndex + 1} of ${LAUNCH_PREP_ACTIONS.length}).`
        }
      }
      if (run.status === 'step_complete') {
        return hasNextStep(process, run)
          ? 'Launch preparation complete. Proceed to Launch sequence.'
          : 'Launch preparation complete.'
      }
    }
    if (step?.kind === 'launch-sequence') {
      if (run.status === 'running') {
        const idx = run.nextMachineIndex
        if (idx < LAUNCH_SEQ_GO_STATIONS.length) {
          const station = LAUNCH_SEQ_GO_STATIONS[idx]
          return `Mission control: ${station.callsign} — report GO (${idx + 1} of ${LAUNCH_SEQ_GO_STATIONS.length}).`
        }
        if (idx === LAUNCH_SEQ_KEY_INDEX) {
          return 'All stations GO. Hold and turn the launch enable key to arm ignition.'
        }
        if (idx === LAUNCH_SEQ_LIFTOFF_INDEX) {
          return 'Key armed. Liftoff sequence in progress…'
        }
        const action = LAUNCH_SEQ_ACTIONS[idx]
        if (action) return action.name
      }
      if (run.status === 'step_complete') {
        return 'Launch sequence complete.'
      }
    }
    if (run.status === 'complete') {
      return runsRemaining > 0
        ? 'Process complete for this unit — vehicle launched. Run Process again for another unit.'
        : 'Process complete. Session run limit reached.'
    }
    return ''
  }

  const showAnyScene =
    showManufacture || showHaul || showLaunchPrep || showLaunchSequence

  return (
    <section className="view-panel" aria-labelledby="simulation-heading">
      <header className="view-panel__header sim-header">
        <div>
          <h2 id="simulation-heading">Simulation</h2>
          <p className="view-panel__lede">
            {step
              ? `${roundTitle ? `${roundTitle} · ` : ''}Process step ${run.currentStepIndex + 1}/${process.steps.length}: ${step.name}`
              : roundTitle
                ? `${roundTitle} — launch ${maxRuns} rockets to complete the round.`
                : `Launch ${maxRuns} rockets to complete the round.`}
          </p>
        </div>
        <div className="sim-header__controls">
          <span className="sim-run-count" aria-live="polite">
            Launches {run.completedRuns}/{maxRuns}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRunProcess}
            disabled={!canRun}
          >
            Run Process
          </button>
        </div>
      </header>

      <div className="view-panel__body sim-body">
        {!sessionActive ? (
          <p className="placeholder-copy">
            Start a session, then run the process: manufacture the booster, haul
            it to the pad, prepare for launch, then execute the launch sequence.
          </p>
        ) : (
          <>
            <div className="sim-status" aria-live="polite">
              {statusMessage()}
            </div>

            {showManufacture && (
              <ManufactureScene
                machines={machines}
                run={run}
                onMachineClick={onMachineClick}
                showProceed={showManufactureProceed}
                onProceed={onProceedToNextStep}
              />
            )}

            {showHaul && (
              <IntegratePayloadScene
                run={run}
                onReachedPad={onReachedPad}
                onMountToPad={onHaulMountToPad}
              />
            )}

            {showLaunchPrep && (
              <LaunchPrepScene
                run={run}
                onActionComplete={onLaunchPrepActionComplete}
              />
            )}

            {showLaunchPrepProceed && (
              <div className="sim-proceed">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={onProceedToNextStep}
                >
                  Proceed to Launch sequence
                </button>
              </div>
            )}

            {showLaunchSequence && (
              <LaunchSequenceScene
                run={run}
                onActionComplete={onLaunchSequenceActionComplete}
              />
            )}

            {!showAnyScene && (
              <p className="placeholder-copy">
                Click Run Process to load a booster onto the manufacture line.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
