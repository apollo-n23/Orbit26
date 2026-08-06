import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunState } from '../types/process'
import {
  LAUNCH_SEQ_GO_STATIONS,
  LAUNCH_SEQ_KEY_INDEX,
  LAUNCH_SEQ_LIFTOFF_INDEX,
} from '../types/process'

interface LaunchSequenceSceneProps {
  run: RunState
  onActionComplete: () => void
}

/** Hold duration to fully turn the launch key (ms). */
const KEY_HOLD_MS = 1400

/**
 * Liftoff cutaway duration before step completes (ms).
 * Keep in sync with CSS animations that use --mc-liftoff-ms on .mc-pad-view.
 */
const LIFTOFF_MS = 3200

/**
 * Mission-control launch sequence: clear GO stations in order, hold-to-turn
 * the launch key, then watch the vehicle leave the pad.
 */
export function LaunchSequenceScene({
  run,
  onActionComplete,
}: LaunchSequenceSceneProps) {
  const actionIndex = run.nextMachineIndex
  const locked = run.status === 'complete' || run.status === 'step_complete'
  const canInteract = run.status === 'running' && !locked

  const finishGuardRef = useRef(false)
  const keyRafRef = useRef<number | null>(null)
  const keyStartRef = useRef(0)
  const liftoffTimerRef = useRef<number | null>(null)
  /** Stable latest callbacks for timers (avoids restarting liftoff when identities change). */
  const onActionCompleteRef = useRef(onActionComplete)
  const canInteractRef = useRef(canInteract)
  onActionCompleteRef.current = onActionComplete
  canInteractRef.current = canInteract

  const [keyProgress, setKeyProgress] = useState(0)
  const [keyDone, setKeyDone] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)

  // Reset local interaction state when this step (re)starts.
  useEffect(() => {
    if (run.status === 'running' && run.currentStepIndex >= 0) {
      finishGuardRef.current = false
      setKeyProgress(0)
      setKeyDone(false)
      setLaunching(false)
      setLaunched(false)
      if (keyRafRef.current != null) {
        cancelAnimationFrame(keyRafRef.current)
        keyRafRef.current = null
      }
      if (liftoffTimerRef.current != null) {
        window.clearTimeout(liftoffTimerRef.current)
        liftoffTimerRef.current = null
      }
    }
  }, [run.status, run.currentStepIndex, run.completedRuns])

  useEffect(() => {
    finishGuardRef.current = false
  }, [actionIndex])

  useEffect(
    () => () => {
      if (keyRafRef.current != null) cancelAnimationFrame(keyRafRef.current)
      if (liftoffTimerRef.current != null) {
        window.clearTimeout(liftoffTimerRef.current)
      }
    },
    [],
  )

  // Sync key / launch visuals from completed action ids.
  useEffect(() => {
    const done = new Set(run.completedMachineIds)
    if (done.has('key-arm')) {
      setKeyDone(true)
      setKeyProgress(100)
    }
    if (done.has('liftoff') || run.status === 'complete') {
      setLaunched(true)
      setLaunching(false)
    }
  }, [run.completedMachineIds, run.status])

  const completeCurrent = useCallback(() => {
    if (!canInteractRef.current || finishGuardRef.current) return
    finishGuardRef.current = true
    onActionCompleteRef.current()
  }, [])

  function handleGo(stationIndex: number) {
    if (!canInteract) return
    if (actionIndex !== stationIndex) return
    if (stationIndex >= LAUNCH_SEQ_GO_STATIONS.length) return
    completeCurrent()
  }

  function stopKeyHold() {
    if (keyRafRef.current != null) {
      cancelAnimationFrame(keyRafRef.current)
      keyRafRef.current = null
    }
  }

  const tickKey = useCallback(() => {
    const elapsed = performance.now() - keyStartRef.current
    const pct = Math.min(100, (elapsed / KEY_HOLD_MS) * 100)
    setKeyProgress(pct)
    if (pct >= 100) {
      keyRafRef.current = null
      setKeyDone(true)
      completeCurrent()
      return
    }
    keyRafRef.current = requestAnimationFrame(tickKey)
  }, [completeCurrent])

  function startKeyHold() {
    if (!canInteract || actionIndex !== LAUNCH_SEQ_KEY_INDEX || keyDone) return
    if (keyProgress >= 100) return
    // Resume from partial progress if released early.
    const resumeMs = (keyProgress / 100) * KEY_HOLD_MS
    keyStartRef.current = performance.now() - resumeMs
    if (keyRafRef.current != null) cancelAnimationFrame(keyRafRef.current)
    keyRafRef.current = requestAnimationFrame(tickKey)
  }

  // When key is armed, begin liftoff cutaway once parent advances to liftoff index.
  // Do not depend on `launching` state: setLaunching(true) would re-run this effect,
  // cleanup would clear the timer, and completeCurrent would never fire.
  useEffect(() => {
    if (!canInteract) return
    if (actionIndex !== LAUNCH_SEQ_LIFTOFF_INDEX) return
    if (run.status === 'complete') return
    if (run.completedMachineIds.includes('liftoff')) return

    setLaunching(true)
    const timerId = window.setTimeout(() => {
      liftoffTimerRef.current = null
      setLaunched(true)
      setLaunching(false)
      completeCurrent()
    }, LIFTOFF_MS)
    liftoffTimerRef.current = timerId

    return () => {
      window.clearTimeout(timerId)
      if (liftoffTimerRef.current === timerId) {
        liftoffTimerRef.current = null
      }
    }
  }, [canInteract, actionIndex, run.status, run.completedMachineIds, completeCurrent])

  const allGosDone = actionIndex >= LAUNCH_SEQ_KEY_INDEX || locked
  const showKey = allGosDone && !launched && (actionIndex === LAUNCH_SEQ_KEY_INDEX || keyDone || launching)
  const showLaunching = launching || (actionIndex === LAUNCH_SEQ_LIFTOFF_INDEX && !launched)
  const showLaunched = launched || locked

  const goRows = LAUNCH_SEQ_GO_STATIONS.map((station, i) => {
    const done =
      run.completedMachineIds.includes(station.id) || i < actionIndex || locked
    const active = canInteract && i === actionIndex && !done
    return { station, done, active, index: i }
  })

  return (
    <div
      className={[
        'launch-seq-scene',
        showLaunched ? 'launch-seq-scene--launched' : '',
        showLaunching ? 'launch-seq-scene--launching' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mc-room" aria-label="Mission control">
        {/* Ambient room / consoles */}
        <div className="mc-room__back" aria-hidden="true">
          <div className="mc-room__ceiling" />
          <div className="mc-room__wall">
            <div className="mc-screens">
              <div className="mc-screen mc-screen--main">
                <div className="mc-screen__label">
                  PAD 1 · LIVE
                  {(showLaunching || showLaunched) && (
                    <span className="mc-screen__live-dot" aria-hidden="true" />
                  )}
                </div>
                <div
                  className={[
                    'mc-pad-view',
                    showLaunching ? 'mc-pad-view--liftoff' : '',
                    showLaunched ? 'mc-pad-view--away' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ ['--mc-liftoff-ms' as string]: `${LIFTOFF_MS}ms` }}
                >
                  <div className="mc-pad-view__sky" aria-hidden="true">
                    <span className="mc-pad-view__star mc-pad-view__star--a" />
                    <span className="mc-pad-view__star mc-pad-view__star--b" />
                    <span className="mc-pad-view__star mc-pad-view__star--c" />
                  </div>
                  <div className="mc-pad-view__ground" aria-hidden="true" />
                  <div className="mc-pad-view__pad" aria-hidden="true" />
                  <div className="mc-pad-view__tower" aria-hidden="true">
                    <span className="mc-pad-view__tower-mast" />
                    <span className="mc-pad-view__tower-arm mc-pad-view__tower-arm--1" />
                    <span className="mc-pad-view__tower-arm mc-pad-view__tower-arm--2" />
                    <span className="mc-pad-view__tower-arm mc-pad-view__tower-arm--3" />
                    <span className="mc-pad-view__tower-base" />
                  </div>
                  <div
                    className={[
                      'mc-pad-view__rocket',
                      showLaunching || showLaunched
                        ? 'mc-pad-view__rocket--liftoff'
                        : '',
                      showLaunched ? 'mc-pad-view__rocket--away' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="mc-rocket__exhaust" aria-hidden="true">
                      <span className="mc-rocket__flame mc-rocket__flame--outer" />
                      <span className="mc-rocket__flame mc-rocket__flame--core" />
                      <span className="mc-rocket__flame mc-rocket__flame--side mc-rocket__flame--l" />
                      <span className="mc-rocket__flame mc-rocket__flame--side mc-rocket__flame--r" />
                    </div>
                    <div className="mc-rocket__body">
                      <span className="mc-rocket__stripe" />
                      <span className="mc-rocket__fin mc-rocket__fin--l" />
                      <span className="mc-rocket__fin mc-rocket__fin--r" />
                    </div>
                    <div className="mc-rocket__nose" />
                  </div>
                  {(showLaunching || showLaunched) && (
                    <div className="mc-pad-view__fx" aria-hidden="true">
                      <span className="mc-pad-view__flash" />
                      <span className="mc-pad-view__glow" />
                      <span className="mc-pad-view__plume mc-pad-view__plume--main" />
                      <span className="mc-pad-view__plume mc-pad-view__plume--left" />
                      <span className="mc-pad-view__plume mc-pad-view__plume--right" />
                      <span className="mc-pad-view__smoke mc-pad-view__smoke--a" />
                      <span className="mc-pad-view__smoke mc-pad-view__smoke--b" />
                      <span className="mc-pad-view__trail" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mc-screen mc-screen--telemetry">
                <div className="mc-screen__label">TELEMETRY</div>
                <div className="mc-telemetry">
                  <span>
                    T
                    {showLaunched || showLaunching ? '+00:00' : '−HOLD'}
                  </span>
                  <span>
                    {showLaunched
                      ? 'ASCEND'
                      : showLaunching
                        ? 'LIFTOFF'
                        : allGosDone
                          ? 'ARMED'
                          : 'POLL'}
                  </span>
                  <span>
                    ALT · {showLaunched ? 'CLR' : showLaunching ? 'RISE' : 'PAD'}
                  </span>
                  <span>VEH · NOM</span>
                </div>
              </div>
              <div className="mc-screen mc-screen--status">
                <div className="mc-screen__label">STATUS</div>
                <div className="mc-status-readout">
                  {showLaunched
                    ? 'Vehicle clear of tower — nominal ascent'
                    : showLaunching
                      ? 'Main engine start — liftoff'
                      : allGosDone
                        ? 'All stations GO — arm key'
                        : 'Launch director poll in progress'}
                </div>
              </div>
            </div>
          </div>
          <div className="mc-room__consoles" aria-hidden="true">
            <div className="mc-console mc-console--left" />
            <div className="mc-console mc-console--center" />
            <div className="mc-console mc-console--right" />
          </div>
        </div>

        {/* Operator panel: GO board + key */}
        <div className="mc-panel">
          <div className="mc-panel__header">
            <span className="mc-panel__title">Launch director poll</span>
            <span className="mc-panel__hint">
              {showLaunched
                ? 'Sequence complete'
                : showLaunching
                  ? 'Vehicle departing pad…'
                  : allGosDone
                    ? 'Hold and turn the launch key to initiate'
                    : 'Clear each station in order — only the active call is armed'}
            </span>
          </div>

          <div className="mc-go-board" role="list" aria-label="GO stations">
            {goRows.map(({ station, done, active, index }) => (
              <div
                key={station.id}
                role="listitem"
                className={[
                  'mc-go-row',
                  done ? 'mc-go-row--go' : '',
                  active ? 'mc-go-row--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="mc-go-row__index" aria-hidden="true">
                  {done ? '✓' : index + 1}
                </span>
                <div className="mc-go-row__meta">
                  <span className="mc-go-row__callsign">{station.callsign}</span>
                  <span className="mc-go-row__name">{station.name}</span>
                </div>
                <span
                  className={[
                    'mc-go-row__lamp',
                    done ? 'mc-go-row__lamp--go' : '',
                    active ? 'mc-go-row__lamp--armed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="mc-go-btn"
                  disabled={!active}
                  onClick={() => handleGo(index)}
                  aria-label={
                    done
                      ? `${station.name} is GO`
                      : active
                        ? `Report ${station.name} GO`
                        : `${station.name} waiting`
                  }
                >
                  {done ? 'GO' : active ? 'GO' : '—'}
                </button>
              </div>
            ))}
          </div>

          <div
            className={[
              'mc-key-bay',
              showKey || showLaunching || showLaunched ? 'mc-key-bay--visible' : '',
              keyDone || showLaunching || showLaunched ? 'mc-key-bay--armed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="mc-key-bay__label">
              Launch enable key
              <span className="mc-key-bay__sub">
                {keyDone || showLaunching || showLaunched
                  ? 'ARMED'
                  : showKey
                    ? 'Hold to turn 90°'
                    : 'Locked until all stations GO'}
              </span>
            </div>
            <button
              type="button"
              className={[
                'mc-key',
                keyDone || showLaunching || showLaunched ? 'mc-key--turned' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                !keyDone && keyProgress > 0
                  ? { ['--mc-key-rot' as string]: `${(keyProgress / 100) * 90}deg` }
                  : undefined
              }
              disabled={!canInteract || actionIndex !== LAUNCH_SEQ_KEY_INDEX || keyDone}
              onPointerDown={(e) => {
                e.preventDefault()
                ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
                startKeyHold()
              }}
              onPointerUp={stopKeyHold}
              onPointerCancel={stopKeyHold}
              onPointerLeave={stopKeyHold}
              onLostPointerCapture={stopKeyHold}
              aria-label="Hold to turn launch key"
            >
              <span className="mc-key__barrel" aria-hidden="true">
                <span className="mc-key__blade" />
                <span className="mc-key__grip" />
              </span>
              <span className="mc-key__ring" aria-hidden="true" />
              <span className="mc-key__progress" aria-hidden="true">
                <span
                  className="mc-key__progress-fill"
                  style={{ width: `${keyDone ? 100 : keyProgress}%` }}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
