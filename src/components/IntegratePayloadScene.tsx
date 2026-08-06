import { useCallback, useEffect, useRef, useState } from 'react'
import { Booster } from './Booster'
import {
  BOOSTER_LENGTH,
  BOOSTER_WIDTH,
  HAUL_PATH,
  HAUL_START,
  LAUNCH_PAD,
  PAD_SEATED,
  PATH_WIDTH,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  boosterTouchesPad,
  clampRotation,
  isBoosterSafe,
  pathPolylinePoints,
  type Point,
} from '../lib/pathGeometry'
import type { RunState } from '../types/process'

interface IntegratePayloadSceneProps {
  run: RunState
  onReachedPad: () => void
  onReorient: () => void
  onPathReset?: () => void
}

interface HaulPose {
  x: number
  y: number
  rotation: number
}

const ORIENTATIONS = [
  { label: '0°', value: 0 },
  { label: '90°', value: 90 },
  { label: '180°', value: 180 },
  { label: '−90°', value: -90 },
] as const

/** Scene units per second while an arrow key is held. */
const MOVE_SPEED = 160

/** How long the explosion plays before reset (ms). Keep in sync with App.css. */
const EXPLODE_MS = 550

const ARROW_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

function startPose(): HaulPose {
  return {
    x: HAUL_START.x,
    y: HAUL_START.y,
    rotation: HAUL_START.rotation,
  }
}

export function IntegratePayloadScene({
  run,
  onReachedPad,
  onReorient,
  onPathReset,
}: IntegratePayloadSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [pose, setPose] = useState<HaulPose>(startPose)
  const [dragging, setDragging] = useState(false)
  const [exploding, setExploding] = useState(false)
  const [seated, setSeated] = useState(false)
  const dragOffset = useRef<Point>({ x: 0, y: 0 })
  const reachedPadRef = useRef(false)
  const poseRef = useRef<HaulPose>(startPose())
  const keysRef = useRef<Set<string>>(new Set())
  const explodingRef = useRef(false)
  const explodeTimerRef = useRef<number | null>(null)
  const canMoveRef = useRef(false)
  /** Only reset local haul state when (re)entering this step, not every render. */
  const haulEpochRef = useRef<string | null>(null)

  const locked =
    run.status === 'awaiting_reorient' ||
    run.status === 'complete' ||
    run.status === 'step_complete'
  const canMove = run.status === 'running' && !seated && !exploding
  canMoveRef.current = canMove
  const showReorient = run.status === 'awaiting_reorient' && !seated

  const clearExplodeTimer = useCallback(() => {
    if (explodeTimerRef.current != null) {
      window.clearTimeout(explodeTimerRef.current)
      explodeTimerRef.current = null
    }
  }, [])

  const applyPose = useCallback((next: HaulPose) => {
    poseRef.current = next
    setPose(next)
  }, [])

  // Enter / re-enter haul step: reset once per epoch.
  useEffect(() => {
    if (run.status !== 'running' || run.currentStepIndex < 0) return

    const epoch = `${run.currentStepIndex}-${run.completedRuns}`
    if (haulEpochRef.current === epoch) return
    haulEpochRef.current = epoch

    clearExplodeTimer()
    explodingRef.current = false
    setExploding(false)
    applyPose(startPose())
    setSeated(false)
    setDragging(false)
    keysRef.current.clear()
    reachedPadRef.current = false

    // Focus map so arrow keys are clearly received.
    window.requestAnimationFrame(() => {
      sceneRef.current?.focus({ preventScroll: true })
    })
  }, [run.status, run.currentStepIndex, run.completedRuns, clearExplodeTimer, applyPose])

  useEffect(() => () => clearExplodeTimer(), [clearExplodeTimer])

  const clientToScene = useCallback((clientX: number, clientY: number): Point => {
    const el = sceneRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    // Map is aspect-locked to SCENE_WIDTH:SCENE_HEIGHT — rect matches viewBox.
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * SCENE_WIDTH
    const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * SCENE_HEIGHT
    return { x, y }
  }, [])

  const explodeAndRestart = useCallback(() => {
    if (explodingRef.current) return
    explodingRef.current = true
    setExploding(true)
    setDragging(false)
    keysRef.current.clear()

    clearExplodeTimer()
    explodeTimerRef.current = window.setTimeout(() => {
      explodeTimerRef.current = null
      applyPose(startPose())
      explodingRef.current = false
      setExploding(false)
      onPathReset?.()
      sceneRef.current?.focus({ preventScroll: true })
    }, EXPLODE_MS)
  }, [clearExplodeTimer, onPathReset, applyPose])

  const tryMoveTo = useCallback(
    (next: HaulPose): boolean => {
      if (explodingRef.current || !canMoveRef.current) return false

      if (!isBoosterSafe({ x: next.x, y: next.y }, next.rotation)) {
        setDragging(false)
        explodeAndRestart()
        return false
      }

      applyPose(next)

      if (
        !reachedPadRef.current &&
        boosterTouchesPad({ x: next.x, y: next.y }, next.rotation)
      ) {
        reachedPadRef.current = true
        setDragging(false)
        keysRef.current.clear()
        onReachedPad()
      }
      return true
    },
    [onReachedPad, explodeAndRestart, applyPose],
  )

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (!canMoveRef.current || explodingRef.current) return
      if (dx === 0 && dy === 0) return
      const p = poseRef.current
      tryMoveTo({
        x: p.x + dx,
        y: p.y + dy,
        rotation: p.rotation,
      })
    },
    [tryMoveTo],
  )

  // Arrow keys: continuous movement while held; update poseRef every tick.
  useEffect(() => {
    if (run.status !== 'running' || seated) {
      keysRef.current.clear()
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code
      if (!ARROW_CODES.has(code)) return
      e.preventDefault()
      e.stopPropagation()
      if (explodingRef.current || !canMoveRef.current) return
      keysRef.current.add(code)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!ARROW_CODES.has(e.code)) return
      keysRef.current.delete(e.code)
    }

    const onBlur = () => {
      keysRef.current.clear()
    }

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (canMoveRef.current && !explodingRef.current && keysRef.current.size > 0) {
        let dx = 0
        let dy = 0
        if (keysRef.current.has('ArrowLeft')) dx -= 1
        if (keysRef.current.has('ArrowRight')) dx += 1
        if (keysRef.current.has('ArrowUp')) dy -= 1
        if (keysRef.current.has('ArrowDown')) dy += 1

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy)
          const step = (MOVE_SPEED * dt) / len
          const p = poseRef.current
          tryMoveTo({
            x: p.x + dx * step,
            y: p.y + dy * step,
            rotation: p.rotation,
          })
        }
      }

      raf = window.requestAnimationFrame(tick)
    }

    window.addEventListener('keydown', onKeyDown, { passive: false, capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    window.addEventListener('blur', onBlur)
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
      window.removeEventListener('blur', onBlur)
      keysRef.current.clear()
    }
  }, [run.status, seated, tryMoveTo])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canMove) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const scenePt = clientToScene(e.clientX, e.clientY)
    const p = poseRef.current
    dragOffset.current = {
      x: p.x - scenePt.x,
      y: p.y - scenePt.y,
    }
    setDragging(true)
    sceneRef.current?.focus({ preventScroll: true })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !canMove) return
    const scenePt = clientToScene(e.clientX, e.clientY)
    tryMoveTo({
      x: scenePt.x + dragOffset.current.x,
      y: scenePt.y + dragOffset.current.y,
      rotation: poseRef.current.rotation,
    })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    setDragging(false)
  }

  function setOrientation(rotation: number) {
    if (!canMoveRef.current || explodingRef.current) return
    const next = {
      ...poseRef.current,
      rotation: clampRotation(rotation),
    }
    if (!isBoosterSafe({ x: next.x, y: next.y }, next.rotation)) {
      explodeAndRestart()
      return
    }
    applyPose(next)
    sceneRef.current?.focus({ preventScroll: true })
  }

  function rotateBy(delta: number) {
    setOrientation(poseRef.current.rotation + delta)
  }

  function handleReorient() {
    setSeated(true)
    applyPose({
      x: PAD_SEATED.x,
      y: PAD_SEATED.y,
      rotation: PAD_SEATED.rotation,
    })
    onReorient()
  }

  // Discrete nudge for on-screen pad (and reliability when keys are captured).
  const NUDGE = 12

  const pathPoints = pathPolylinePoints(HAUL_PATH)

  return (
    <div className="haul-scene">
      <div className="haul-scene__toolbar">
        <div className="haul-orient" aria-label="Booster orientation">
          <span className="haul-orient__label">Re-orient booster</span>
          <div className="haul-orient__buttons">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!canMove}
              onClick={() => rotateBy(-90)}
              title="Rotate counter-clockwise 90°"
            >
              ↺ 90°
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!canMove}
              onClick={() => rotateBy(90)}
              title="Rotate clockwise 90°"
            >
              ↻ 90°
            </button>
            {ORIENTATIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                className={[
                  'btn btn--ghost',
                  clampRotation(pose.rotation) === clampRotation(o.value)
                    ? 'btn--ghost-active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!canMove}
                onClick={() => setOrientation(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="haul-dpad" aria-label="Move booster">
          <span className="haul-orient__label">Move</span>
          <div className="haul-dpad__grid">
            <span />
            <button
              type="button"
              className="btn btn--ghost haul-dpad__btn"
              disabled={!canMove}
              onClick={() => nudge(0, -NUDGE)}
              aria-label="Move up"
            >
              ↑
            </button>
            <span />
            <button
              type="button"
              className="btn btn--ghost haul-dpad__btn"
              disabled={!canMove}
              onClick={() => nudge(-NUDGE, 0)}
              aria-label="Move left"
            >
              ←
            </button>
            <button
              type="button"
              className="btn btn--ghost haul-dpad__btn"
              disabled={!canMove}
              onClick={() => sceneRef.current?.focus({ preventScroll: true })}
              title="Focus map for arrow keys"
              aria-label="Focus map"
            >
              ⌨
            </button>
            <button
              type="button"
              className="btn btn--ghost haul-dpad__btn"
              disabled={!canMove}
              onClick={() => nudge(NUDGE, 0)}
              aria-label="Move right"
            >
              →
            </button>
            <span />
            <button
              type="button"
              className="btn btn--ghost haul-dpad__btn"
              disabled={!canMove}
              onClick={() => nudge(0, NUDGE)}
              aria-label="Move down"
            >
              ↓
            </button>
            <span />
          </div>
        </div>

        {showReorient && (
          <button
            type="button"
            className="btn btn--primary btn--reorient"
            onClick={handleReorient}
          >
            Reorient
          </button>
        )}
      </div>

      <div
        ref={sceneRef}
        className={[
          'haul-map',
          exploding ? 'haul-map--exploding' : '',
          seated ? 'haul-map--seated' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={0}
        role="application"
        aria-label="Haul map — arrow keys move the booster along the road"
        onPointerDown={() => sceneRef.current?.focus({ preventScroll: true })}
      >
        <svg
          className="haul-map__svg"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="haul-grass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d7a35" />
              <stop offset="45%" stopColor="#2f6a2a" />
              <stop offset="100%" stopColor="#255522" />
            </linearGradient>
            <pattern
              id="haul-grass-texture"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <rect width="28" height="28" fill="transparent" />
              <path
                d="M4 22 Q6 12 5 6 M12 26 Q14 14 13 5 M20 24 Q22 13 21 7 M8 18 Q9 10 8 4"
                fill="none"
                stroke="rgba(20, 70, 18, 0.28)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </pattern>
            <radialGradient id="haul-field-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="50%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(10, 28, 8, 0.35)" />
            </radialGradient>
            <linearGradient id="haul-road" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4a4f56" />
              <stop offset="50%" stopColor="#3d4249" />
              <stop offset="100%" stopColor="#353a41" />
            </linearGradient>
          </defs>

          <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#haul-grass)" />
          <rect
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fill="url(#haul-grass-texture)"
          />
          <rect
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fill="url(#haul-field-vignette)"
          />

          <polyline
            points={pathPoints}
            fill="none"
            stroke="url(#haul-road)"
            strokeWidth={PATH_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(255, 220, 90, 0.55)"
            strokeWidth={2}
            strokeDasharray="12 10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g className="haul-building">
            <rect
              x="18"
              y="175"
              width="110"
              height="130"
              rx="4"
              fill="#2a3038"
              stroke="#5a6574"
              strokeWidth="2"
            />
            <rect x="30" y="195" width="28" height="22" fill="#1a222c" />
            <rect x="68" y="195" width="28" height="22" fill="#1a222c" />
            <rect x="30" y="230" width="28" height="22" fill="#1a222c" />
            <rect x="68" y="230" width="28" height="22" fill="#1a222c" />
            <rect
              x="48"
              y="268"
              width="50"
              height="28"
              fill="#151a21"
              stroke="#5a6574"
            />
            <text
              x="73"
              y="165"
              textAnchor="middle"
              fill="#e8f0e4"
              fontSize="13"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="600"
            >
              Assembly
            </text>
          </g>

          <g className="haul-pad">
            <rect
              x={LAUNCH_PAD.x}
              y={LAUNCH_PAD.y}
              width={LAUNCH_PAD.width}
              height={LAUNCH_PAD.height}
              rx="6"
              fill={
                locked || seated
                  ? 'rgba(59, 130, 196, 0.35)'
                  : 'rgba(55, 60, 68, 0.95)'
              }
              stroke={locked || seated ? '#5ba3e0' : '#8a929c'}
              strokeWidth="2"
            />
            <circle
              cx={PAD_SEATED.x}
              cy={PAD_SEATED.y}
              r="18"
              fill="none"
              stroke="rgba(212, 160, 23, 0.55)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <text
              x={PAD_SEATED.x}
              y={LAUNCH_PAD.y - 12}
              textAnchor="middle"
              fill="#e8f0e4"
              fontSize="13"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="600"
            >
              Launch Pad
            </text>
          </g>
        </svg>

        <div
          className={[
            'haul-booster',
            dragging ? 'haul-booster--dragging' : '',
            canMove ? 'haul-booster--draggable' : '',
            seated ? 'haul-booster--seated' : '',
            exploding ? 'haul-booster--exploding' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${(pose.x / SCENE_WIDTH) * 100}%`,
            top: `${(pose.y / SCENE_HEIGHT) * 100}%`,
            width: `${(BOOSTER_LENGTH / SCENE_WIDTH) * 100}%`,
            height: `${(BOOSTER_WIDTH / SCENE_HEIGHT) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${pose.rotation}deg)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {!exploding && (
            <Booster
              className="booster--haul"
              ready={seated}
              label={
                seated
                  ? 'Booster seated on launch pad'
                  : 'Booster — arrow keys or on-screen controls to move'
              }
            />
          )}
        </div>

        {exploding && (
          <div
            className="haul-explosion"
            style={{
              left: `${(pose.x / SCENE_WIDTH) * 100}%`,
              top: `${(pose.y / SCENE_HEIGHT) * 100}%`,
            }}
            aria-live="assertive"
            role="img"
            aria-label="Booster left the road and exploded — resetting to Assembly"
          >
            <span className="haul-explosion__core" />
            <span className="haul-explosion__ring" />
            <span className="haul-explosion__ring haul-explosion__ring--late" />
            <span className="haul-explosion__spark haul-explosion__spark--1" />
            <span className="haul-explosion__spark haul-explosion__spark--2" />
            <span className="haul-explosion__spark haul-explosion__spark--3" />
            <span className="haul-explosion__spark haul-explosion__spark--4" />
            <span className="haul-explosion__spark haul-explosion__spark--5" />
            <span className="haul-explosion__spark haul-explosion__spark--6" />
            <span className="haul-explosion__flash" />
          </div>
        )}
      </div>
    </div>
  )
}
