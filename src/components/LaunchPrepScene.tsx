import { useCallback, useEffect, useRef, useState } from 'react'
import { Booster } from './Booster'
import type { RunState } from '../types/process'
import { LAUNCH_PREP_ACTIONS } from '../types/process'

interface LaunchPrepSceneProps {
  run: RunState
  onActionComplete: () => void
}

const CRANE_STEPS = [
  { id: 'extend', label: '1 · Extend boom' },
  { id: 'lift', label: '2 · Lift payload' },
  { id: 'swing', label: '3 · Swing over vehicle' },
  { id: 'lower', label: '4 · Lower & attach' },
] as const

const POWER_SWITCHES = [
  { id: 'avionics', label: 'Avionics bus' },
  { id: 'flight', label: 'Flight computers' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'range', label: 'Range safety arm' },
] as const

const FILL_RATE_PER_MS = 0.045 // % per ms while holding (~2.2s to fill)

/**
 * Pad-side launch preparation: mate booster to tower, crane-stack payload,
 * fuel umbilicals, power-up checklist. Each sub-task must be completed in order.
 */
export function LaunchPrepScene({
  run,
  onActionComplete,
}: LaunchPrepSceneProps) {
  const actionIndex = run.nextMachineIndex
  const locked = run.status === 'complete' || run.status === 'step_complete'
  const canInteract = run.status === 'running' && !locked

  /** Prevents double-firing complete when pointer/slider events race. */
  const finishGuardRef = useRef(false)

  // —— Sub-task 1: mate ——
  const [mateProgress, setMateProgress] = useState(0)
  const [mateDone, setMateDone] = useState(false)

  // —— Sub-task 2: crane ——
  const [craneStep, setCraneStep] = useState(0)
  const [craneDone, setCraneDone] = useState(false)

  // —— Sub-task 3: fuel ——
  const [loxConnected, setLoxConnected] = useState(false)
  const [rpConnected, setRpConnected] = useState(false)
  const [loxFill, setLoxFill] = useState(0)
  const [rpFill, setRpFill] = useState(0)
  const [fuelDone, setFuelDone] = useState(false)
  const fillTargetRef = useRef<'lox' | 'rp' | null>(null)
  const fillRafRef = useRef<number | null>(null)
  const fillLastRef = useRef(0)

  // —— Sub-task 4: power ——
  const [powerArmed, setPowerArmed] = useState<string[]>([])
  const [powerDone, setPowerDone] = useState(false)

  // Reset local interaction state when this step (re)starts.
  useEffect(() => {
    if (run.status === 'running' && run.currentStepIndex >= 0) {
      finishGuardRef.current = false
      setMateProgress(0)
      setMateDone(false)
      setCraneStep(0)
      setCraneDone(false)
      setLoxConnected(false)
      setRpConnected(false)
      setLoxFill(0)
      setRpFill(0)
      setFuelDone(false)
      setPowerArmed([])
      setPowerDone(false)
      fillTargetRef.current = null
      if (fillRafRef.current != null) {
        cancelAnimationFrame(fillRafRef.current)
        fillRafRef.current = null
      }
    }
  }, [run.status, run.currentStepIndex, run.completedRuns])

  // Allow the next sub-task to complete after parent advances actionIndex.
  useEffect(() => {
    finishGuardRef.current = false
  }, [actionIndex])

  useEffect(
    () => () => {
      if (fillRafRef.current != null) cancelAnimationFrame(fillRafRef.current)
    },
    [],
  )

  // Sync done flags from completed action ids (e.g. after re-render from parent).
  useEffect(() => {
    const done = new Set(run.completedMachineIds)
    if (done.has('mate-tower')) setMateDone(true)
    if (done.has('crane-payload')) setCraneDone(true)
    if (done.has('fuel-vehicle')) setFuelDone(true)
    if (done.has('power-up')) setPowerDone(true)
  }, [run.completedMachineIds])

  const completeCurrent = useCallback(() => {
    if (!canInteract || finishGuardRef.current) return
    finishGuardRef.current = true
    onActionComplete()
  }, [canInteract, onActionComplete])

  // —— Mate: drag slider to 100% ——
  function handleMateChange(value: number) {
    if (!canInteract || actionIndex !== 0 || mateDone) return
    const v = Math.max(0, Math.min(100, value))
    setMateProgress(v)
    if (v >= 100) {
      setMateDone(true)
      completeCurrent()
    }
  }

  // —— Crane: numbered click sequence ——
  function handleCraneStep(step: number) {
    if (!canInteract || actionIndex !== 1 || craneDone) return
    if (step !== craneStep) return
    const next = craneStep + 1
    setCraneStep(next)
    if (next >= CRANE_STEPS.length) {
      setCraneDone(true)
      completeCurrent()
    }
  }

  // —— Fuel: connect umbilicals, hold-to-fill ——
  function stopFill() {
    fillTargetRef.current = null
    if (fillRafRef.current != null) {
      cancelAnimationFrame(fillRafRef.current)
      fillRafRef.current = null
    }
  }

  const tickFill = useCallback(() => {
    const target = fillTargetRef.current
    if (!target) return
    const now = performance.now()
    const dt = Math.min(50, now - fillLastRef.current)
    fillLastRef.current = now
    const delta = FILL_RATE_PER_MS * dt

    if (target === 'lox') {
      setLoxFill((prev) => {
        const next = Math.min(100, prev + delta)
        if (next >= 100) fillTargetRef.current = null
        return next
      })
    } else {
      setRpFill((prev) => {
        const next = Math.min(100, prev + delta)
        if (next >= 100) fillTargetRef.current = null
        return next
      })
    }

    fillRafRef.current = requestAnimationFrame(tickFill)
  }, [])

  function startFill(which: 'lox' | 'rp') {
    if (!canInteract || actionIndex !== 2 || fuelDone) return
    if (which === 'lox' && (!loxConnected || loxFill >= 100)) return
    if (which === 'rp' && (!rpConnected || rpFill >= 100)) return
    fillTargetRef.current = which
    fillLastRef.current = performance.now()
    if (fillRafRef.current != null) cancelAnimationFrame(fillRafRef.current)
    fillRafRef.current = requestAnimationFrame(tickFill)
  }

  // When both tanks full, complete fuel action.
  useEffect(() => {
    if (!canInteract || actionIndex !== 2 || fuelDone) return
    if (loxFill >= 100 && rpFill >= 100) {
      setFuelDone(true)
      stopFill()
      completeCurrent()
    }
  }, [loxFill, rpFill, canInteract, actionIndex, fuelDone, completeCurrent])

  // —— Power: arm switches in order ——
  function handlePowerSwitch(id: string, index: number) {
    if (!canInteract || actionIndex !== 3 || powerDone) return
    if (powerArmed.length !== index) return
    if (powerArmed.includes(id)) return
    const next = [...powerArmed, id]
    setPowerArmed(next)
    if (next.length >= POWER_SWITCHES.length) {
      setPowerDone(true)
      completeCurrent()
    }
  }

  const stepComplete = locked || powerDone
  const mated = mateDone || mateProgress >= 100 || actionIndex > 0
  const payloadStacked = craneDone || actionIndex > 1
  const fueled = fuelDone || actionIndex > 2
  const powered = powerDone || actionIndex > 3 || locked

  // Crane visual phase from completed clicks (0–4).
  const craneVisual = craneDone || actionIndex > 1 ? 4 : craneStep

  const checklist = LAUNCH_PREP_ACTIONS.map((action, i) => {
    const done =
      run.completedMachineIds.includes(action.id) ||
      (i === 0 && mateDone) ||
      (i === 1 && craneDone) ||
      (i === 2 && fuelDone) ||
      (i === 3 && powerDone) ||
      i < actionIndex
    const active = canInteract && i === actionIndex && !done
    return { action, done, active, index: i }
  })

  return (
    <div
      className={[
        'launch-prep-scene',
        stepComplete ? 'launch-prep-scene--ready' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="launch-prep-scene__checklist" aria-label="Launch prep tasks">
        {checklist.map(({ action, done, active, index }) => (
          <div
            key={action.id}
            className={[
              'lp-check',
              done ? 'lp-check--done' : '',
              active ? 'lp-check--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="lp-check__num" aria-hidden="true">
              {done ? '✓' : index + 1}
            </span>
            <span className="lp-check__label">{action.name}</span>
          </div>
        ))}
      </div>

      <div className="launch-prep-pad" aria-hidden="true">
        <div className="launch-prep-pad__sky" />
        <div className="launch-prep-pad__ground" />

        {/* Launch tower + strongback */}
        <div className={['lp-tower', mated ? 'lp-tower--mated' : ''].join(' ')}>
          <div className="lp-tower__mast">
            <span className="lp-tower__cross" />
            <span className="lp-tower__cross" />
            <span className="lp-tower__cross" />
            <span className="lp-tower__cross" />
          </div>
          <div
            className="lp-tower__strongback"
            style={
              actionIndex === 0 && !mateDone
                ? { ['--mate' as string]: `${mateProgress / 100}` }
                : undefined
            }
          >
            <span className="lp-tower__clamp" />
            <span className="lp-tower__clamp lp-tower__clamp--mid" />
            <span className="lp-tower__clamp lp-tower__clamp--low" />
          </div>
          <div className="lp-tower__base" />
        </div>

        {/* Booster: slides from pad side into tower when mating */}
        <div
          className={[
            'lp-booster-slot',
            mated ? 'lp-booster-slot--mated' : 'lp-booster-slot--staging',
          ].join(' ')}
          style={
            actionIndex === 0 && !mateDone
              ? {
                  ['--mate' as string]: `${mateProgress / 100}`,
                }
              : undefined
          }
        >
          <Booster
            className="booster--launch-prep"
            ready={stepComplete}
            label={mated ? 'Booster on strongback' : 'Booster staged at pad'}
          />
          {payloadStacked && (
            <div className="lp-payload" title="Payload / fairing">
              <span className="lp-payload__fairing" />
              <span className="lp-payload__band" />
            </div>
          )}
        </div>

        {/* Mobile crane */}
        <div
          className={[
            'lp-crane',
            `lp-crane--phase-${craneVisual}`,
            payloadStacked ? 'lp-crane--clear' : '',
          ].join(' ')}
        >
          <div className="lp-crane__base" />
          <div className="lp-crane__cab" />
          <div className="lp-crane__boom">
            <div className="lp-crane__jib">
              <div className="lp-crane__cable" />
              {!payloadStacked && craneVisual >= 2 && (
                <div className="lp-crane__hook-load">
                  <span className="lp-payload__fairing lp-payload__fairing--hook" />
                </div>
              )}
            </div>
          </div>
          {craneVisual < 2 && !payloadStacked && (
            <div className="lp-crane__ground-load">
              <span className="lp-payload__fairing" />
            </div>
          )}
        </div>

        {/* Fuel umbilicals visual */}
        <div
          className={[
            'lp-umbilicals',
            loxConnected || fueled ? 'lp-umbilicals--lox' : '',
            rpConnected || fueled ? 'lp-umbilicals--rp' : '',
            fueled ? 'lp-umbilicals--flowing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="lp-umbilical lp-umbilical--lox" />
          <span className="lp-umbilical lp-umbilical--rp" />
        </div>

        {/* Power glow when armed */}
        {powered && <div className="lp-power-glow" />}
      </div>

      {/* Operator controls for the active sub-task */}
      <div className="launch-prep-controls">
        {canInteract && actionIndex === 0 && (
          <div className="lp-panel">
            <p className="lp-panel__title">1 · Mate booster to tower</p>
            <p className="lp-panel__hint">
              Slide the strongback control to raise and mate the booster with the
              launch tower.
            </p>
            <label className="lp-slider">
              <span className="lp-slider__label">Strongback mate</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={mateProgress}
                onChange={(e) => handleMateChange(Number(e.target.value))}
                aria-valuetext={`${mateProgress}% mated`}
              />
              <span className="lp-slider__value">{mateProgress}%</span>
            </label>
          </div>
        )}

        {canInteract && actionIndex === 1 && (
          <div className="lp-panel">
            <p className="lp-panel__title">2 · Stack payload with crane</p>
            <p className="lp-panel__hint">
              Operate the pad crane in sequence to lift the payload fairing and
              place it on the booster.
            </p>
            <div className="lp-crane-controls" role="group" aria-label="Crane sequence">
              {CRANE_STEPS.map((step, i) => {
                const isNext = i === craneStep
                const isDone = i < craneStep
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={[
                      'btn btn--ghost lp-crane-btn',
                      isNext ? 'lp-crane-btn--next' : '',
                      isDone ? 'lp-crane-btn--done' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!isNext}
                    onClick={() => handleCraneStep(i)}
                  >
                    {isDone ? `✓ ${step.label}` : step.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {canInteract && actionIndex === 2 && (
          <div className="lp-panel">
            <p className="lp-panel__title">3 · Fuel the vehicle</p>
            <p className="lp-panel__hint">
              Connect LOX and RP-1 umbilicals, then hold each fill control until
              tanks are full.
            </p>
            <div className="lp-fuel-grid">
              <div className="lp-fuel-col">
                <button
                  type="button"
                  className={[
                    'btn btn--ghost',
                    loxConnected ? 'btn--ghost-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={loxConnected}
                  onClick={() => setLoxConnected(true)}
                >
                  {loxConnected ? '✓ LOX umbilical' : 'Connect LOX'}
                </button>
                <div className="lp-gauge" aria-label={`LOX ${Math.round(loxFill)}%`}>
                  <div
                    className="lp-gauge__fill lp-gauge__fill--lox"
                    style={{ height: `${loxFill}%` }}
                  />
                  <span className="lp-gauge__readout">{Math.round(loxFill)}%</span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary lp-hold-btn"
                  disabled={!loxConnected || loxFill >= 100}
                  onPointerDown={() => startFill('lox')}
                  onPointerUp={stopFill}
                  onPointerLeave={stopFill}
                  onPointerCancel={stopFill}
                >
                  {loxFill >= 100 ? 'LOX full' : 'Hold to fill LOX'}
                </button>
              </div>
              <div className="lp-fuel-col">
                <button
                  type="button"
                  className={[
                    'btn btn--ghost',
                    rpConnected ? 'btn--ghost-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={rpConnected}
                  onClick={() => setRpConnected(true)}
                >
                  {rpConnected ? '✓ RP-1 umbilical' : 'Connect RP-1'}
                </button>
                <div className="lp-gauge" aria-label={`RP-1 ${Math.round(rpFill)}%`}>
                  <div
                    className="lp-gauge__fill lp-gauge__fill--rp"
                    style={{ height: `${rpFill}%` }}
                  />
                  <span className="lp-gauge__readout">{Math.round(rpFill)}%</span>
                </div>
                <button
                  type="button"
                  className="btn btn--primary lp-hold-btn"
                  disabled={!rpConnected || rpFill >= 100}
                  onPointerDown={() => startFill('rp')}
                  onPointerUp={stopFill}
                  onPointerLeave={stopFill}
                  onPointerCancel={stopFill}
                >
                  {rpFill >= 100 ? 'RP-1 full' : 'Hold to fill RP-1'}
                </button>
              </div>
            </div>
          </div>
        )}

        {canInteract && actionIndex === 3 && (
          <div className="lp-panel">
            <p className="lp-panel__title">4 · Power up for launch</p>
            <p className="lp-panel__hint">
              Arm launch systems in order — only the next switch is enabled.
            </p>
            <div className="lp-power-row" role="group" aria-label="Power checklist">
              {POWER_SWITCHES.map((sw, i) => {
                const isArmed = powerArmed.includes(sw.id)
                const isNext = powerArmed.length === i
                return (
                  <button
                    key={sw.id}
                    type="button"
                    className={[
                      'lp-switch',
                      isArmed ? 'lp-switch--on' : '',
                      isNext ? 'lp-switch--next' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!isNext}
                    onClick={() => handlePowerSwitch(sw.id, i)}
                    aria-pressed={isArmed}
                  >
                    <span className="lp-switch__toggle" aria-hidden="true" />
                    <span className="lp-switch__label">
                      {i + 1}. {sw.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {stepComplete && (
          <div className="lp-panel lp-panel--complete">
            <p className="lp-panel__title">Launch preparation complete</p>
            <p className="lp-panel__hint">
              Vehicle is stacked, fueled, and powered. Unit run finished.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
