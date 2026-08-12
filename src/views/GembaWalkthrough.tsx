import { useEffect, useMemo, useState } from 'react'
import { ManufactureScene } from '../components/ManufactureScene'
import { HaulRoadScene } from '../components/HaulRoadScene'
import { LaunchPrepScene } from '../components/LaunchPrepScene'
import { LaunchSequenceScene } from '../components/LaunchSequenceScene'
import { GembaContextPanel } from '../components/GembaContextPanel'
import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import { StepIcon } from '../components/StepIcon'
import { getRoundConfig } from '../data/rounds'
import type { AppStage } from '../types/round'
import type { RunState } from '../types/process'
import {
  INITIAL_RUN_STATE,
  MACHINE_CYCLE_MS,
  MACHINE_FAIL_CYCLE_MS,
  MACHINE_HALF_SPEED_MULTIPLIER,
} from '../types/process'
import {
  failMachineWork,
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
  resolveLaunchPrepTechs,
  resolveLaunchSeqConfig,
} from '../lib/processEdit'

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

/**
 * As-is process, read-only. Never mutated here — Gemba only ever walks it,
 * it never redesigns it. RoundSession clones this same config into its own
 * state on mount, so referencing it directly is safe.
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
 * "Go to the Gemba" — walk the as-is process step by step, on demand,
 * to observe and document it. Unlike a scored round: any step can be opened
 * directly (no sequential Run Process / Proceed gate), nothing is timed,
 * and nothing is ever logged to the Data tab or carried into As-is,
 * Redesign, or To-be — this view owns its own local, throwaway state and
 * never touches theirs.
 */
interface GembaWalkthroughProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

export function GembaWalkthrough({
  activeStage,
  onNavigateStage,
}: GembaWalkthroughProps) {
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
  const launchPrepTechs = useMemo(
    () => resolveLaunchPrepTechs(process),
    [process],
  )
  const launchSeqConfig = useMemo(
    () => resolveLaunchSeqConfig(process),
    [process],
  )

  useEffect(() => {
    if (run.status !== 'machine_working') return

    // Damaged machine's failed-attempt animation (approach → glow red →
    // retreat) — never completes, must match ManufactureScene's own timers.
    if (run.activeMachineWillFail) {
      const failId = window.setTimeout(() => {
        setRun((prev) => failMachineWork(prev))
      }, MACHINE_FAIL_CYCLE_MS)
      return () => window.clearTimeout(failId)
    }

    // A damaged machine's retry-after-failure run plays at half speed — must
    // match ManufactureScene's own doubled animation timers exactly.
    const cycleMs = run.activeMachineHalfSpeed
      ? MACHINE_CYCLE_MS * MACHINE_HALF_SPEED_MULTIPLIER
      : MACHINE_CYCLE_MS
    const id = window.setTimeout(() => {
      setRun((prev) => finishMachineWork(process, prev))
    }, cycleMs)
    return () => window.clearTimeout(id)
  }, [
    run.status,
    run.activeMachineId,
    run.activeMachineHalfSpeed,
    run.activeMachineWillFail,
    process,
  ])

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
        return 'Use arrow keys (or click-and-drag) to move the booster along the road to the Launch Pad. Be careful not to let the booster stray too far off the road or it will explode!'
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
      <SiteBrand
        subtitle="Gemba walk · As-is"
        activeStage={activeStage}
        onNavigate={onNavigateStage}
      />
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      {step && <GembaContextPanel stepId={step.id} stepKind={step.kind} />}
      <main className="app-main">
        <section className="view-panel" aria-labelledby="gemba-heading">
          <header className="view-panel__header gemba-banner">
            <span className="gemba-banner__logo-badge" aria-hidden="true">
              <img
                src={ORBIT_LOGO_SRC}
                alt=""
                className="gemba-banner__logo"
                width={64}
                height={64}
                decoding="async"
              />
            </span>
            <div className="gemba-banner__body">
              <h2 id="gemba-heading">Gemba walk</h2>
              <p className="view-panel__lede">
                Walk the as-is process one step at a time to observe and
                document it — jump to any step directly, in any order.
              </p>
              <p className="gemba-banner__note" role="status">
                <strong>Go to the Gemba:</strong> this is the as-is process
                exactly as built — nothing here can be redesigned. Nothing is
                timed, scored, or logged; it never touches As-is play, the
                redesign workshop, To-be, or the Data tab.
              </p>
            </div>
          </header>

          <div className="view-panel__body redesign-body">
            <nav className="gemba-stepper" aria-label="Gemba steps">
              {process.steps.map((s, index) => (
                <div className="gemba-stepper__item" key={s.id}>
                  {index > 0 && (
                    <span className="gemba-stepper__connector" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    className={
                      stepIndex === index
                        ? 'gemba-stepper__step gemba-stepper__step--active'
                        : 'gemba-stepper__step'
                    }
                    onClick={() => selectStep(index)}
                  >
                    <span className="gemba-stepper__icon">
                      <StepIcon kind={s.kind} />
                    </span>
                    <span className="gemba-stepper__label">
                      <span className="gemba-stepper__index">{index + 1}</span>
                      {s.name}
                    </span>
                  </button>
                </div>
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
              <HaulRoadScene
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
                techs={launchPrepTechs}
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
