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
  isBoosterOnPath,
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

export function IntegratePayloadScene({
  run,
  onReachedPad,
  onReorient,
  onPathReset,
}: IntegratePayloadSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [pose, setPose] = useState<HaulPose>({
    x: HAUL_START.x,
    y: HAUL_START.y,
    rotation: HAUL_START.rotation,
  })
  const [dragging, setDragging] = useState(false)
  const [resetPulse, setResetPulse] = useState(false)
  const [seated, setSeated] = useState(false)
  const dragOffset = useRef<Point>({ x: 0, y: 0 })
  const reachedPadRef = useRef(false)

  const locked =
    run.status === 'awaiting_reorient' ||
    run.status === 'complete' ||
    run.status === 'step_complete'
  const canDrag = run.status === 'running' && !seated
  const showReorient =
    run.status === 'awaiting_reorient' && !seated

  // Reset haul pose when a new run of this step begins.
  useEffect(() => {
    if (run.status === 'running' && run.currentStepIndex >= 0) {
      setPose({
        x: HAUL_START.x,
        y: HAUL_START.y,
        rotation: HAUL_START.rotation,
      })
      setSeated(false)
      setDragging(false)
      reachedPadRef.current = false
    }
  }, [run.status, run.currentStepIndex, run.completedRuns])

  const clientToScene = useCallback((clientX: number, clientY: number): Point => {
    const el = sceneRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * SCENE_WIDTH
    const y = ((clientY - rect.top) / rect.height) * SCENE_HEIGHT
    return { x, y }
  }, [])

  const resetToStart = useCallback(() => {
    setPose({
      x: HAUL_START.x,
      y: HAUL_START.y,
      rotation: pose.rotation,
    })
    setResetPulse(true)
    window.setTimeout(() => setResetPulse(false), 450)
    onPathReset?.()
  }, [onPathReset, pose.rotation])

  const tryMoveTo = useCallback(
    (next: HaulPose) => {
      if (!isBoosterOnPath({ x: next.x, y: next.y }, next.rotation)) {
        setDragging(false)
        resetToStart()
        return
      }

      setPose(next)

      if (
        !reachedPadRef.current &&
        boosterTouchesPad({ x: next.x, y: next.y }, next.rotation)
      ) {
        reachedPadRef.current = true
        setDragging(false)
        onReachedPad()
      }
    },
    [onReachedPad, resetToStart],
  )

  function handlePointerDown(e: React.PointerEvent) {
    if (!canDrag) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const scenePt = clientToScene(e.clientX, e.clientY)
    dragOffset.current = {
      x: pose.x - scenePt.x,
      y: pose.y - scenePt.y,
    }
    setDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !canDrag) return
    const scenePt = clientToScene(e.clientX, e.clientY)
    tryMoveTo({
      x: scenePt.x + dragOffset.current.x,
      y: scenePt.y + dragOffset.current.y,
      rotation: pose.rotation,
    })
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    setDragging(false)
  }

  function setOrientation(rotation: number) {
    if (!canDrag) return
    const next = { ...pose, rotation: clampRotation(rotation) }
    if (!isBoosterOnPath({ x: next.x, y: next.y }, next.rotation)) {
      // Rotation would leave the corridor — snap back to start with new heading.
      setPose({
        x: HAUL_START.x,
        y: HAUL_START.y,
        rotation: next.rotation,
      })
      setResetPulse(true)
      window.setTimeout(() => setResetPulse(false), 450)
      onPathReset?.()
      return
    }
    setPose(next)
  }

  function rotateBy(delta: number) {
    setOrientation(pose.rotation + delta)
  }

  function handleReorient() {
    setSeated(true)
    setPose({
      x: PAD_SEATED.x,
      y: PAD_SEATED.y,
      rotation: PAD_SEATED.rotation,
    })
    onReorient()
  }

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
              disabled={!canDrag}
              onClick={() => rotateBy(-90)}
              title="Rotate counter-clockwise 90°"
            >
              ↺ 90°
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!canDrag}
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
                disabled={!canDrag}
                onClick={() => setOrientation(o.value)}
              >
                {o.label}
              </button>
            ))}
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
          resetPulse ? 'haul-map--reset' : '',
          seated ? 'haul-map--seated' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <svg
          className="haul-map__svg"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Ground grid */}
          <defs>
            <pattern
              id="haul-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(42,50,61,0.55)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#haul-grid)" />

          {/* Transport corridor — 50% wider than booster short side */}
          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(58, 69, 84, 0.95)"
            strokeWidth={PATH_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(90, 104, 122, 0.55)"
            strokeWidth={2}
            strokeDasharray="10 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Assembly building */}
          <g className="haul-building">
            <rect
              x="18"
              y="175"
              width="110"
              height="130"
              rx="4"
              fill="#1e242c"
              stroke="#3a4554"
              strokeWidth="2"
            />
            <rect x="30" y="195" width="28" height="22" fill="#2a3340" />
            <rect x="68" y="195" width="28" height="22" fill="#2a3340" />
            <rect x="30" y="230" width="28" height="22" fill="#2a3340" />
            <rect x="68" y="230" width="28" height="22" fill="#2a3340" />
            <rect
              x="48"
              y="268"
              width="50"
              height="28"
              fill="#151a21"
              stroke="#3a4554"
            />
            <text
              x="73"
              y="165"
              textAnchor="middle"
              fill="#9aa6b5"
              fontSize="13"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="600"
            >
              Assembly
            </text>
          </g>

          {/* Launch pad */}
          <g className="haul-pad">
            <rect
              x={LAUNCH_PAD.x}
              y={LAUNCH_PAD.y}
              width={LAUNCH_PAD.width}
              height={LAUNCH_PAD.height}
              rx="6"
              fill={
                locked || seated
                  ? 'rgba(59, 130, 196, 0.22)'
                  : 'rgba(42, 50, 61, 0.9)'
              }
              stroke={
                locked || seated ? '#3b82c4' : '#5a6574'
              }
              strokeWidth="2"
            />
            <circle
              cx={PAD_SEATED.x}
              cy={PAD_SEATED.y}
              r="18"
              fill="none"
              stroke="rgba(212, 160, 23, 0.45)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <text
              x={PAD_SEATED.x}
              y={LAUNCH_PAD.y - 12}
              textAnchor="middle"
              fill="#9aa6b5"
              fontSize="13"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="600"
            >
              Launch Pad
            </text>
          </g>
        </svg>

        {/* HTML booster overlay for drag + CSS art */}
        <div
          className={[
            'haul-booster',
            dragging ? 'haul-booster--dragging' : '',
            canDrag ? 'haul-booster--draggable' : '',
            seated ? 'haul-booster--seated' : '',
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
          <Booster
            className="booster--haul"
            ready={seated}
            label={
              seated
                ? 'Booster seated on launch pad'
                : 'Booster — drag along the path'
            }
          />
        </div>
      </div>
    </div>
  )
}
