import { useEffect, useMemo } from 'react'
import { ManufactureScene } from '../components/ManufactureScene'
import { IntegratePayloadScene } from '../components/IntegratePayloadScene'
import { LaunchPrepScene } from '../components/LaunchPrepScene'
import type { ProcessVersion, RunState } from '../types/process'
import {
  LAUNCH_PREP_ACTIONS,
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
  onRunProcess: () => void
  onMachineClick: (machineId: string) => void
  onMachineWorkFinished: () => void
  onProceedToNextStep: () => void
  onReachedPad: () => void
  onHaulReorient: () => void
  onLaunchPrepActionComplete: () => void
}

export function SimulationView({
  process,
  run,
  sessionActive,
  onRunProcess,
  onMachineClick,
  onMachineWorkFinished,
  onProceedToNextStep,
  onReachedPad,
  onHaulReorient,
  onLaunchPrepActionComplete,
}: SimulationViewProps) {
  const runsRemaining = MAX_RUNS_PER_SESSION - run.completedRuns
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

  const showManufactureProceed =
    run.status === 'step_complete' &&
    step?.kind === 'manufacture' &&
    hasNextStep(process, run)

  const showHaulProceed =
    run.status === 'step_complete' &&
    step?.kind === 'haul' &&
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
        return `Booster moves to station ${required.sequence}. Operate ${required.name} when it arrives (sequence ${required.sequence} of ${machines.length}).`
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
        return 'Booster is on the pad. Click Reorient to seat it correctly and finish this step.'
      }
      if (run.status === 'step_complete') {
        return hasNextStep(process, run)
          ? 'Payload integration complete. Proceed to Prepare for launch.'
          : 'Payload integration complete.'
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
        return 'Launch preparation complete.'
      }
    }
    if (run.status === 'complete') {
      return runsRemaining > 0
        ? 'Process complete for this unit. Run Process again for another unit.'
        : 'Process complete. Session run limit reached.'
    }
    return ''
  }

  return (
    <section className="view-panel" aria-labelledby="simulation-heading">
      <header className="view-panel__header sim-header">
        <div>
          <h2 id="simulation-heading">Simulation</h2>
          <p className="view-panel__lede">
            {step
              ? `Process step ${run.currentStepIndex + 1}/${process.steps.length}: ${step.name}`
              : 'Execute the current process on the production floor.'}
          </p>
        </div>
        <div className="sim-header__controls">
          <span className="sim-run-count" aria-live="polite">
            Runs {run.completedRuns}/{MAX_RUNS_PER_SESSION}
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
            it to the pad, then prepare for launch.
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
                onReorient={onHaulReorient}
              />
            )}

            {showHaulProceed && (
              <div className="sim-proceed">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={onProceedToNextStep}
                >
                  Proceed to next step
                </button>
              </div>
            )}

            {showLaunchPrep && (
              <LaunchPrepScene
                run={run}
                onActionComplete={onLaunchPrepActionComplete}
              />
            )}

            {!showManufacture && !showHaul && !showLaunchPrep && (
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
