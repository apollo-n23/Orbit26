import { useEffect, useMemo, useState } from 'react'
import { ManufactureScene } from '../components/ManufactureScene'
import { IntegratePayloadScene } from '../components/IntegratePayloadScene'
import { LaunchPrepScene } from '../components/LaunchPrepScene'
import { LaunchSequenceScene } from '../components/LaunchSequenceScene'
import { SiteBrand } from '../components/SiteBrand'
import { getRoundConfig } from '../data/rounds'
import type { RunState } from '../types/process'
import { INITIAL_RUN_STATE, MACHINE_CYCLE_MS } from '../types/process'
import {
  finishLaunchPrepAction,
  finishLaunchSequenceAction,
  finishMachineWork,
  getActiveStep,
  getStepMachines,
  markOnPad,
  startMachineWork,
} from '../lib/simulation'
import {
  resolveAutoMoveBooster,
  resolveHaulPath,
  resolveLaunchPrepTech,
  resolveLaunchSeqConfig,
} from '../lib/processEdit'

/**
 * Round 1's as-is process, read-only. Never mutated here — Gemba only ever
 * walks it, it never redesigns it. RoundSession clones this same config
 * into its own state on mount, so referencing it directly is safe.
 */
const GEMBA_PROCESS = getRoundConfig(1).process

function freshStepRun(stepIndex: number): RunState {
  return {
    ...INITIAL_RUN_STATE,
    status: 'running',
    currentStepIndex: stepIndex,
  }
}

/**
 * "Go to the Gemba" — walk Round 1's as-is process step by step, on demand,
 * to observe and document it. Unlike a real round: any step can be opened
 * directly (no sequential Run Process / Proceed gate), nothing is timed,
 * and nothing is ever logged to the Data tab or carried into Round 1,
 * Redesign, or Round 2 — this view owns its own local, throwaway state and
 * never touches theirs.
 */
export function GembaWalkthrough() {
  const process = GEMBA_PROCESS
  const [stepIndex, setStepIndex] = useState(0)
  const [run, setRun] = useState<RunState>(() => freshStepRun(0))
  // Bumped on every step selection (even re-selecting the same step) so the
  // scene below remounts fully fresh — no stale seated/positioned state.
  const [visitNonce, setVisitNonce] = useState(0)

  function selectStep(index: number) {
    setStepIndex(index)
    setRun(freshStepRun(index))
    setVisitNonce((n) => n + 1)
  }

  const step = getActiveStep(process, run)
  const machines = useMemo(() => getStepMachines(step), [step])
  const haulPath = useMemo(() => resolveHaulPath(process), [process])
  const autoMoveBooster = useMemo(
    () => resolveAutoMoveBooster(process),
    [process],
  )
  const launchPrepTech = useMemo(
    () => resolveLaunchPrepTech(process),
    [process],
  )
  const launchSeqConfig = useMemo(
    () => resolveLaunchSeqConfig(process),
    [process],
  )

  useEffect(() => {
    if (run.status !== 'machine_working') return
    const id = window.setTimeout(() => {
      setRun((prev) => finishMachineWork(process, prev))
    }, MACHINE_CYCLE_MS)
    return () => window.clearTimeout(id)
  }, [run.status, run.activeMachineId, process])

  const handleMachineClick = (machineId: string) => {
    setRun((prev) => startMachineWork(process, prev, machineId))
  }
  const handleReachedPad = () => {
    setRun((prev) => markOnPad(prev))
  }
  // Deliberately not wired to completeHaulStep — that auto-advances to the
  // next process step, which would fight the step nav below. The scene's
  // own "seated" visual already shows arrival; Gemba just leaves it there.
  const handleHaulMountToPad = () => {}
  const handleLaunchPrepActionComplete = () => {
    setRun((prev) => finishLaunchPrepAction(process, prev))
  }
  const handleLaunchSequenceActionComplete = () => {
    setRun((prev) => finishLaunchSequenceAction(process, prev))
  }

  const showManufacture =
    step?.kind === 'manufacture' &&
    (run.status === 'running' ||
      run.status === 'machine_working' ||
      run.status === 'step_complete')
  const showHaul =
    step?.kind === 'haul' &&
    (run.status === 'running' ||
      run.status === 'awaiting_reorient' ||
      run.status === 'step_complete')
  const showLaunchPrep =
    step?.kind === 'launch-prep' &&
    (run.status === 'running' || run.status === 'step_complete')
  const showLaunchSequence =
    step?.kind === 'launch-sequence' &&
    (run.status === 'running' ||
      run.status === 'step_complete' ||
      run.status === 'complete')

  function statusMessage(): string {
    if (!step) return 'Pick a step above to walk through it.'
    if (step.kind === 'manufacture') {
      if (run.status === 'running') {
        return 'Drag the booster to the next required station, enter its access code, then Activate.'
      }
      if (run.status === 'machine_working') {
        return 'Machine approaches, works the booster, then retreats…'
      }
      if (run.status === 'step_complete') {
        return 'All manufacture stations complete. Pick another step above to keep walking the process.'
      }
    }
    if (step.kind === 'haul') {
      if (run.status === 'running') {
        return 'Use arrow keys (or the on-screen controls) to move the booster along the road to the Launch Pad.'
      }
      if (run.status === 'awaiting_reorient') {
        return 'Booster is on the pad — click Mount to launch pad to seat it.'
      }
    }
    if (step.kind === 'launch-prep') {
      if (run.status === 'running') {
        return 'Work through mate, payload, fuel, and power-up in order.'
      }
      if (run.status === 'step_complete') {
        return 'Launch prep complete. Pick another step above to keep walking the process.'
      }
    }
    if (step.kind === 'launch-sequence') {
      if (run.status === 'running') {
        return 'Clear each GO call, then hold and turn the key to arm ignition.'
      }
      if (run.status === 'complete') {
        return 'Liftoff — sequence complete. Pick another step above to keep walking the process.'
      }
    }
    return ''
  }

  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Gemba walk · Round 1 as-is" />
      </header>
      <main className="app-main">
        <section className="view-panel" aria-labelledby="gemba-heading">
          <header className="view-panel__header sim-header">
            <div>
              <h2 id="gemba-heading">Gemba walk</h2>
              <p className="view-panel__lede">
                Walk Round 1's as-is process one step at a time to observe
                and document it — jump to any step directly, in any order.
              </p>
            </div>
          </header>

          <div className="view-panel__body redesign-body">
            <div className="redesign-warning" role="status">
              <strong>Go to the Gemba:</strong> this is Round 1's process
              exactly as built — nothing here can be redesigned. Nothing is
              timed, scored, or logged; it never touches Round 1, the
              redesign workshop, Round 2, or the Data tab.
            </div>

            <nav className="redesign-tabs" aria-label="Gemba steps">
              {process.steps.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  className={
                    stepIndex === index
                      ? 'redesign-tabs__btn redesign-tabs__btn--active'
                      : 'redesign-tabs__btn'
                  }
                  onClick={() => selectStep(index)}
                >
                  {index + 1} · {s.name}
                </button>
              ))}
            </nav>

            <div className="gemba-step-toolbar">
              <div className="sim-status" aria-live="polite">
                {statusMessage()}
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => selectStep(stepIndex)}
              >
                Reset step
              </button>
            </div>

            {showManufacture && (
              <ManufactureScene
                key={`gemba-mfg-${visitNonce}`}
                machines={machines}
                run={run}
                onMachineClick={handleMachineClick}
                autoMoveBooster={autoMoveBooster}
              />
            )}

            {showHaul && (
              <IntegratePayloadScene
                key={`gemba-haul-${visitNonce}`}
                run={run}
                haulPath={haulPath}
                onReachedPad={handleReachedPad}
                onMountToPad={handleHaulMountToPad}
              />
            )}

            {showLaunchPrep && (
              <LaunchPrepScene
                key={`gemba-launch-prep-${visitNonce}`}
                run={run}
                process={process}
                tech={launchPrepTech}
                onActionComplete={handleLaunchPrepActionComplete}
              />
            )}

            {showLaunchSequence && (
              <LaunchSequenceScene
                key={`gemba-launch-seq-${visitNonce}`}
                run={run}
                process={process}
                config={launchSeqConfig}
                onActionComplete={handleLaunchSequenceActionComplete}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
