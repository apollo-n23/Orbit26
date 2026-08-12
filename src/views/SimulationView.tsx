import { useEffect, useMemo } from 'react'
import { ManufactureScene } from '../components/ManufactureScene'
import { HaulRoadScene } from '../components/HaulRoadScene'
import { LaunchPrepScene } from '../components/LaunchPrepScene'
import { LaunchSequenceScene } from '../components/LaunchSequenceScene'
import type { ProcessVersion, RunState } from '../types/process'
import {
  LAUNCH_PREP_ACTIONS,
  MACHINE_CYCLE_MS,
  MACHINE_FAIL_CYCLE_MS,
  MACHINE_HALF_SPEED_MULTIPLIER,
  MAX_RUNS_PER_SESSION,
} from '../types/process'
import {
  getActiveStep,
  getStepMachines,
  hasNextStep,
} from '../lib/simulation'
import {
  resolveAutoMoveBooster,
  resolveHaulPath,
  resolveLaunchPrepTechs,
  resolveLaunchSeqConfig,
} from '../lib/processEdit'

interface SimulationViewProps {
  process: ProcessVersion
  run: RunState
  sessionActive: boolean
  /** Launches required this round (default MAX_RUNS_PER_SESSION). */
  maxRuns?: number
  roundTitle?: string
  onStartSession: () => void
  onRunProcess: () => void
  onMachineClick: (machineId: string) => void
  onMachineWorkFinished: () => void
  /** A damaged machine's failed-attempt animation finished — not a completion. */
  onMachineFailed: () => void
  onProceedToNextStep: () => void
  onReachedPad: () => void
  onHaulMountToPad: () => void
  /** Booster exploded off the haul road (process step 2) — a logged defect. */
  onHaulExplode?: () => void
  /** Missed the extend-boom or swing-over-vehicle sweet spot (process step 3) — a logged defect. */
  onLaunchPrepDefect?: () => void
  onLaunchPrepActionComplete: () => void
  onLaunchSequenceActionComplete: () => void
  /** Download the same redesign-choices snapshot as the workshop's "Save my current choices" — only offered once a redesign has been confirmed for this round. */
  onSaveChoices?: () => void
  /** Session timer paused via the pause toggle — locks every process step's interactions. */
  paused?: boolean
  /** Toggle the pause state (shown once a session is active). */
  onTogglePause?: () => void
  /** Fires when the operator attempts to interact with a process step while paused. */
  onBlockedInteraction?: () => void
  /** Transient reminder shown after a blocked interaction attempt. */
  pauseNotice?: string | null
}

function ClockIcon() {
  return (
    <svg
      className="btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg
      className="btn__icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function ResumeIcon() {
  return (
    <svg
      className="btn__icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 5v14l12-7z" />
    </svg>
  )
}

function GoIcon() {
  return (
    <svg
      className="btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export function SimulationView({
  process,
  run,
  sessionActive,
  maxRuns = MAX_RUNS_PER_SESSION,
  roundTitle,
  onStartSession,
  onRunProcess,
  onMachineClick,
  onMachineWorkFinished,
  onMachineFailed,
  onProceedToNextStep,
  onReachedPad,
  onHaulMountToPad,
  onHaulExplode,
  onLaunchPrepDefect,
  onLaunchPrepActionComplete,
  onLaunchSequenceActionComplete,
  onSaveChoices,
  paused = false,
  onTogglePause,
  onBlockedInteraction,
  pauseNotice,
}: SimulationViewProps) {
  const runsRemaining = maxRuns - run.completedRuns
  const canRun =
    sessionActive &&
    !paused &&
    (run.status === 'idle' || run.status === 'complete') &&
    runsRemaining > 0

  const step = getActiveStep(process, run)
  const machines = useMemo(() => getStepMachines(step), [step])
  const required = machines[run.nextMachineIndex]
  /** Redesigned or default haul centerline for this process version. */
  const haulPath = useMemo(() => resolveHaulPath(process), [process])
  const haulPathKey = useMemo(
    () => haulPath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|'),
    [haulPath],
  )
  const autoMoveBooster = useMemo(
    () => resolveAutoMoveBooster(process),
    [process],
  )
  const launchPrepTechs = useMemo(
    () => resolveLaunchPrepTechs(process),
    [process],
  )
  /** GO list / key / liftoff indices from redesign (or baseline). */
  const launchSeqConfig = useMemo(
    () => resolveLaunchSeqConfig(process),
    [process],
  )
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

    // Damaged machine's failed-attempt animation (approach → glow red →
    // retreat) — never completes, must match ManufactureScene's own timers.
    if (run.activeMachineWillFail) {
      const failId = window.setTimeout(() => {
        onMachineFailed()
      }, MACHINE_FAIL_CYCLE_MS)
      return () => window.clearTimeout(failId)
    }

    // Full cycle: machine approaches line → works → retreats, then unlock next.
    // A damaged machine's retry-after-failure run plays at half speed —
    // must match ManufactureScene's own doubled animation timers exactly.
    const cycleMs = run.activeMachineHalfSpeed
      ? MACHINE_CYCLE_MS * MACHINE_HALF_SPEED_MULTIPLIER
      : MACHINE_CYCLE_MS
    const id = window.setTimeout(() => {
      onMachineWorkFinished()
    }, cycleMs)

    return () => window.clearTimeout(id)
  }, [
    run.status,
    run.activeMachineId,
    run.activeMachineHalfSpeed,
    run.activeMachineWillFail,
    onMachineWorkFinished,
    onMachineFailed,
  ])

  function statusMessage(): string {
    if (!sessionActive) {
      return 'Start a session to begin manufacturing.'
    }
    if (paused) {
      return 'Session paused — resume it to keep working the process.'
    }
    if (run.status === 'idle') {
      return 'Click Run Process to place a booster on the production line.'
    }
    if (step?.kind === 'manufacture') {
      if (run.status === 'running' && required) {
        const moveHint = autoMoveBooster
          ? `Booster auto-transfers between stations. At station ${required.sequence} (${required.name})`
          : `Drag the booster to station ${required.sequence} (${required.name})`
        return `${moveHint}, enter access code ${required.accessCode} from the banner, then Activate (${required.sequence} of ${machines.length}).`
      }
      if (run.status === 'machine_working' && run.activeMachineId) {
        const active = machines.find((m) => m.id === run.activeMachineId)
        return `${active?.name ?? 'Machine'} approaches the line, works the booster, then returns to park…`
      }
      if (run.status === 'step_complete') {
        return hasNextStep(process, run)
          ? 'Manufacture complete. Proceed to Haul road.'
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
          let name = action.name
          if (action.id === 'power-up' && launchPrepTechs.includes('auto-power')) {
            name = 'Power up for launch (master ON)'
          } else if (
            action.id === 'crane-payload' &&
            launchPrepTechs.includes('payload-drone')
          ) {
            name = 'Stack payload with drone'
          } else if (
            action.id === 'fuel-vehicle' &&
            launchPrepTechs.includes('faster-pumps')
          ) {
            name = 'Fuel the vehicle (high-flow pumps)'
          }
          return `Launch pad: ${name} (${run.nextMachineIndex + 1} of ${LAUNCH_PREP_ACTIONS.length}).`
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
        const { goStations, actions, keyIndex, liftoffIndex } = launchSeqConfig
        if (idx < goStations.length) {
          const station = goStations[idx]
          return `Mission control: ${station.callsign} — report GO (${idx + 1} of ${goStations.length}).`
        }
        if (idx === keyIndex) {
          return 'All stations GO. Hold and turn the launch enable key to arm ignition.'
        }
        if (idx === liftoffIndex) {
          return 'Key armed. Liftoff sequence in progress…'
        }
        const action = actions[idx]
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
            onClick={onStartSession}
            disabled={sessionActive || run.completedRuns >= maxRuns}
            title={
              sessionActive
                ? 'Session already active'
                : 'When you click this, the timer will begin.'
            }
          >
            <ClockIcon />
            {sessionActive ? 'Session Active' : 'Start Session'}
          </button>
          {sessionActive && onTogglePause && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onTogglePause}
              title={
                paused
                  ? 'Resume the session timer and unlock the process.'
                  : 'Pause the session timer and lock the process until resumed.'
              }
            >
              {paused ? <ResumeIcon /> : <PauseIcon />}
              {paused ? 'Resume session' : 'Pause session'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={onRunProcess}
            disabled={!canRun}
          >
            <GoIcon />
            Run Process
          </button>
          {onSaveChoices && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onSaveChoices}
              title="Download a text snapshot of this round's confirmed redesign choices."
            >
              Save my current choices
            </button>
          )}
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

            {pauseNotice && (
              <p className="sim-pause-notice" role="alert">
                {pauseNotice}
              </p>
            )}

            <div className="sim-scene-wrap">
              {showManufacture && (
                <ManufactureScene
                  machines={machines}
                  run={run}
                  onMachineClick={onMachineClick}
                  showProceed={showManufactureProceed}
                  onProceed={onProceedToNextStep}
                  autoMoveBooster={autoMoveBooster}
                  paused={paused}
                />
              )}

              {showHaul && (
                <HaulRoadScene
                  key={`haul-path-${process.id}-${haulPathKey.slice(0, 64)}`}
                  run={run}
                  haulPath={haulPath}
                  onReachedPad={onReachedPad}
                  onMountToPad={onHaulMountToPad}
                  onExplode={onHaulExplode}
                  paused={paused}
                  onBlockedInteraction={onBlockedInteraction}
                />
              )}

              {showLaunchPrep && (
                <LaunchPrepScene
                  key={`launch-prep-${process.id}-${launchPrepTechs.join(',') || 'none'}-${run.completedRuns}`}
                  run={run}
                  process={process}
                  techs={launchPrepTechs}
                  onActionComplete={onLaunchPrepActionComplete}
                  onDefect={onLaunchPrepDefect}
                  paused={paused}
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
                  key={`launch-seq-${process.id}-${launchSeqConfig.goStations.map((s) => s.id).join('-')}-${[...launchSeqConfig.realignedGoIds].join('-')}`}
                  run={run}
                  process={process}
                  config={launchSeqConfig}
                  onActionComplete={onLaunchSequenceActionComplete}
                  paused={paused}
                />
              )}

              {!showAnyScene && (
                <p className="placeholder-copy">
                  Click Run Process to load a booster onto the manufacture line.
                </p>
              )}

              {paused && showAnyScene && (
                <button
                  type="button"
                  className="sim-paused-overlay"
                  onClick={onBlockedInteraction}
                  aria-label="Session paused — resume it to continue"
                >
                  <PauseIcon />
                  <span className="sim-paused-overlay__title">
                    Session paused
                  </span>
                  <span className="sim-paused-overlay__hint">
                    Resume the session with the Resume session button above to
                    keep working the process.
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
