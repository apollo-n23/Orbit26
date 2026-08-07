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
  /** Optional redesigned haul centerline; defaults to HAUL_PATH. */
  haulPath?: Point[]
  onReachedPad: () => void
  /** Mount booster to the launch pad (seats pose + completes haul / auto-advances). */
  onMountToPad: () => void
  /** Booster left the safe road and exploded — fires once the reset animation finishes. */
  onExplode?: () => void
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

/** Coastline: the rightmost road-grid column (roadGrid.ts ROAD_COLS=20, col 19) is sea. */
const SEA_X = 760
/** Narrow sand band between the grass of the main map and the sea. */
const SAND_WIDTH = 14
const SAND_X = SEA_X - SAND_WIDTH

/**
 * Restricted-airspace placard drawn around the pad. Purely decorative — no
 * handlers are attached to it, so it is never interactive.
 */
const NO_FLY_MARGIN = 30
const NO_FLY_ZONE = {
  x: LAUNCH_PAD.x - NO_FLY_MARGIN,
  y: LAUNCH_PAD.y - NO_FLY_MARGIN,
  width: LAUNCH_PAD.width + NO_FLY_MARGIN * 2,
  height: LAUNCH_PAD.height + NO_FLY_MARGIN * 2,
}
const NO_FLY_MARKER_INSET = 20
const NO_FLY_MARKERS: Point[] = [
  { x: NO_FLY_ZONE.x + NO_FLY_MARKER_INSET, y: NO_FLY_ZONE.y + NO_FLY_MARKER_INSET },
  {
    x: NO_FLY_ZONE.x + NO_FLY_ZONE.width - NO_FLY_MARKER_INSET,
    y: NO_FLY_ZONE.y + NO_FLY_MARKER_INSET,
  },
  {
    x: NO_FLY_ZONE.x + NO_FLY_MARKER_INSET,
    y: NO_FLY_ZONE.y + NO_FLY_ZONE.height - NO_FLY_MARKER_INSET,
  },
  {
    x: NO_FLY_ZONE.x + NO_FLY_ZONE.width - NO_FLY_MARKER_INSET,
    y: NO_FLY_ZONE.y + NO_FLY_ZONE.height - NO_FLY_MARKER_INSET,
  },
]

function startPose(): HaulPose {
  return {
    x: HAUL_START.x,
    y: HAUL_START.y,
    rotation: HAUL_START.rotation,
  }
}

export function IntegratePayloadScene({
  run,
  haulPath,
  onReachedPad,
  onMountToPad,
  onExplode,
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
  // Prefer explicit redesigned path from process; only fall back to baseline winding road.
  const activePath =
    Array.isArray(haulPath) && haulPath.length >= 2
      ? haulPath.map((p) => ({ x: p.x, y: p.y }))
      : HAUL_PATH
  const pathRef = useRef(activePath)
  pathRef.current = activePath

  const locked =
    run.status === 'awaiting_reorient' ||
    run.status === 'complete' ||
    run.status === 'step_complete'
  const canMove = run.status === 'running' && !seated && !exploding
  canMoveRef.current = canMove
  const showMountToPad = run.status === 'awaiting_reorient' && !seated

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
      onExplode?.()
      sceneRef.current?.focus({ preventScroll: true })
    }, EXPLODE_MS)
  }, [clearExplodeTimer, onExplode, applyPose])

  const tryMoveTo = useCallback(
    (next: HaulPose): boolean => {
      if (explodingRef.current || !canMoveRef.current) return false

      if (
        !isBoosterSafe(
          { x: next.x, y: next.y },
          next.rotation,
          pathRef.current,
        )
      ) {
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
    if (
      !isBoosterSafe(
        { x: next.x, y: next.y },
        next.rotation,
        pathRef.current,
      )
    ) {
      explodeAndRestart()
      return
    }
    applyPose(next)
    sceneRef.current?.focus({ preventScroll: true })
  }

  function rotateBy(delta: number) {
    setOrientation(poseRef.current.rotation + delta)
  }

  function handleMountToPad() {
    setSeated(true)
    applyPose({
      x: PAD_SEATED.x,
      y: PAD_SEATED.y,
      rotation: PAD_SEATED.rotation,
    })
    onMountToPad()
  }

  // Discrete nudge for on-screen pad (and reliability when keys are captured).
  const NUDGE = 12

  const pathPoints = pathPolylinePoints(activePath)

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

        {showMountToPad && (
          <button
            type="button"
            className="btn btn--primary btn--mount-pad"
            onClick={handleMountToPad}
            aria-label="Mount to launch pad"
          >
            Mount to launch pad
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
            <linearGradient id="haul-sand" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c9a866" />
              <stop offset="100%" stopColor="#ddc383" />
            </linearGradient>
            <pattern
              id="haul-sand-texture"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <rect width="10" height="10" fill="transparent" />
              <circle cx="2" cy="3" r="0.6" fill="rgba(110, 82, 34, 0.35)" />
              <circle cx="7" cy="7" r="0.5" fill="rgba(110, 82, 34, 0.3)" />
              <circle cx="5" cy="2" r="0.4" fill="rgba(255, 255, 255, 0.18)" />
            </pattern>
            {/* Sea gradient stops match the brand palette (brand-indigo / brand-navy — see index.css). */}
            <linearGradient id="haul-sea" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e345d" />
              <stop offset="45%" stopColor="#00538a" />
              <stop offset="100%" stopColor="#1e345d" />
            </linearGradient>
            <pattern
              id="haul-sea-texture"
              width="34"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <rect width="34" height="24" fill="transparent" />
              <path
                d="M0 14 Q8 8 16 14 T34 14"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.4"
                fill="none"
              />
              <path
                d="M-4 20 Q6 15 16 20 T36 20"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1.2"
                fill="none"
              />
            </pattern>
          </defs>

          <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#haul-grass)" />
          <rect
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fill="url(#haul-grass-texture)"
          />

          <g className="haul-coast" aria-hidden="true">
            <rect
              x={SAND_X}
              y="0"
              width={SAND_WIDTH}
              height={SCENE_HEIGHT}
              fill="url(#haul-sand)"
            />
            <rect
              x={SAND_X}
              y="0"
              width={SAND_WIDTH}
              height={SCENE_HEIGHT}
              fill="url(#haul-sand-texture)"
            />
            <rect
              x={SEA_X}
              y="0"
              width={SCENE_WIDTH - SEA_X}
              height={SCENE_HEIGHT}
              fill="url(#haul-sea)"
            />
            <rect
              x={SEA_X}
              y="0"
              width={SCENE_WIDTH - SEA_X}
              height={SCENE_HEIGHT}
              fill="url(#haul-sea-texture)"
            />
            <path
              d="M 762 0 Q 750 40 762 80 Q 772 120 758 160 Q 748 200 764 240 Q 774 280 756 320 Q 748 360 766 400 Q 774 440 760 480"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2"
              fill="none"
            />
          </g>

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

          <g className="haul-trees" aria-hidden="true">
            {/*
              Fixed decorative obstacle in the open grass pocket between the
              Assembly building and the road's loop around it (scene rect
              x=280–360, y=240–360 — matches roadGrid.ts TREE_CLUSTER_CELLS,
              cols 7–8 / rows 6–8, a 2x3 block). Purely visual: this pocket
              is already outside the drivable safe corridor, and the
              matching grid cells are locked from being painted as road in
              the Round 2 redesign workshop.
            */}
            {[
              { cx: 340, cy: 250, r: 17 },
              { cx: 298, cy: 258, r: 20 },
              { cx: 302, cy: 300, r: 21 },
              { cx: 343, cy: 293, r: 17 },
              { cx: 316, cy: 336, r: 19 },
              { cx: 350, cy: 330, r: 16 },
            ].map((tree, i) => (
              <g key={i} transform={`translate(${tree.cx}, ${tree.cy})`}>
                <ellipse
                  cx="0"
                  cy={tree.r * 0.9}
                  rx={tree.r * 1.0}
                  ry={tree.r * 0.32}
                  fill="rgba(6, 16, 5, 0.4)"
                />
                <rect
                  x={-tree.r * 0.2}
                  y={tree.r * 0.3}
                  width={tree.r * 0.4}
                  height={tree.r * 0.7}
                  rx={tree.r * 0.05}
                  fill="#5b3a22"
                  stroke="#2e1c10"
                  strokeWidth="1.5"
                />
                <circle
                  r={tree.r * 1.08}
                  fill="#0f2b12"
                  opacity="0.55"
                />
                <circle
                  r={tree.r}
                  fill="#2c6b2c"
                  stroke="#123714"
                  strokeWidth="2.25"
                />
                <circle
                  cx={-tree.r * 0.05}
                  cy={-tree.r * 0.05}
                  r={tree.r * 0.72}
                  fill="#3c8a3a"
                  opacity="0.8"
                />
                <circle
                  cx={-tree.r * 0.32}
                  cy={-tree.r * 0.32}
                  r={tree.r * 0.4}
                  fill="#57b054"
                  opacity="0.75"
                />
              </g>
            ))}
          </g>

          <g className="haul-building haul-building--offices" aria-hidden="true">
            {/*
              Offices annex, to the left of Assembly, clear of the road (the
              nearest road segment runs x=95-220 at y=240 — this sits at
              x=8-48). Assembly's own rect kept its right edge at x=128 (the
              HAUL_START exit-apron alignment) and only lost width off its
              left side to make room here.
            */}
            <rect
              x="8"
              y="175"
              width="40"
              height="130"
              rx="4"
              fill="#2a3038"
              stroke="#777779"
              strokeWidth="2"
            />
            <rect x="18" y="195" width="20" height="22" fill="#1a222c" />
            <rect x="18" y="230" width="20" height="22" fill="#1a222c" />
            <rect
              x="18"
              y="268"
              width="20"
              height="28"
              fill="#151a21"
              stroke="#777779"
            />
            <text
              x="28"
              y="240"
              textAnchor="middle"
              transform="rotate(-90 28 240)"
              fill="#c9c8c7"
              fontSize="11"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="600"
              letterSpacing="1"
            >
              Offices
            </text>
          </g>

          <g className="haul-building">
            <rect
              x="56"
              y="175"
              width="72"
              height="130"
              rx="4"
              fill="#2a3038"
              stroke="#777779"
              strokeWidth="2"
            />
            <image
              href={`${import.meta.env.BASE_URL}OrbitLogo.png`}
              x="83"
              y="178"
              width="18"
              height="18"
              opacity="0.9"
            />
            <rect x="64" y="195" width="20" height="22" fill="#1a222c" />
            <rect x="100" y="195" width="20" height="22" fill="#1a222c" />
            <rect x="64" y="230" width="20" height="22" fill="#1a222c" />
            <rect x="100" y="230" width="20" height="22" fill="#1a222c" />
            <rect
              x="74"
              y="268"
              width="36"
              height="28"
              fill="#151a21"
              stroke="#777779"
            />
            <text
              x="92"
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
            <image
              href={`${import.meta.env.BASE_URL}OrbitLogo.png`}
              x={PAD_SEATED.x - 30}
              y={PAD_SEATED.y - 30}
              width="60"
              height="60"
              opacity="0.9"
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

          {/* Restricted-airspace placard — decorative only, never interactive. */}
          <g className="haul-no-fly" aria-hidden="true">
            <rect
              x={NO_FLY_ZONE.x}
              y={NO_FLY_ZONE.y}
              width={NO_FLY_ZONE.width}
              height={NO_FLY_ZONE.height}
              rx="24"
              fill="none"
              stroke="rgba(230, 57, 53, 0.75)"
              strokeWidth="3"
              strokeDasharray="10 8"
            />
            {NO_FLY_MARKERS.map((m, i) => (
              <g key={i} transform={`translate(${m.x}, ${m.y})`}>
                <circle
                  r="13"
                  fill="rgba(35, 10, 10, 0.9)"
                  stroke="#ff6b5e"
                  strokeWidth="2"
                />
                <line
                  x1="-7"
                  y1="-7"
                  x2="7"
                  y2="7"
                  stroke="#ffcfc9"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="-7"
                  y1="7"
                  x2="7"
                  y2="-7"
                  stroke="#ffcfc9"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <line
                  x1="-10"
                  y1="10"
                  x2="10"
                  y2="-10"
                  stroke="#ff6b5e"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
            ))}
            <text
              x={PAD_SEATED.x}
              y={NO_FLY_ZONE.y + NO_FLY_ZONE.height + 18}
              textAnchor="middle"
              fill="#ff8a75"
              fontSize="11"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="700"
              letterSpacing="1.5"
            >
              NO FLY ZONE
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
