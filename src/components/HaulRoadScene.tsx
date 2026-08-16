import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Booster } from './Booster'
import {
  BOOSTER_LENGTH,
  BOOSTER_WIDTH,
  HAUL_PATH,
  HAUL_START,
  LAUNCH_PAD,
  PAD_SEATED,
  PATH_HALF,
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

/** Isometric cutaway building sprites for the haul map (public/). */
const HAUL_OFFICES_SRC = `${import.meta.env.BASE_URL}HaulOfficesTop.png?v=3`
const HAUL_ASSEMBLY_SRC = `${import.meta.env.BASE_URL}HaulAssemblyTop.png?v=3`

/** Full-field grassland plate — shared with the redesign paint grid. */
export const HAUL_GRASS_SRC = `${import.meta.env.BASE_URL}HaulGrassField.jpg?v=1`
export const HAUL_PAD_SRC = `${import.meta.env.BASE_URL}HaulPadDeck.jpg?v=2`
export const HAUL_RUNWAY_SRC = `${import.meta.env.BASE_URL}HaulRunwayTile.jpg?v=1`
export const HAUL_RUNWAY_CORNER_SRC = `${import.meta.env.BASE_URL}HaulRunwayCorner.jpg?v=1`
export const HAUL_COAST_SRC = `${import.meta.env.BASE_URL}HaulCoastStrip.jpg?v=1`
export const HAUL_ERECTOR_ARM_SRC = `${import.meta.env.BASE_URL}HaulErectorArm.png?v=1`
export const HAUL_ERECTOR_BASE_SRC = `${import.meta.env.BASE_URL}HaulErectorBase.png?v=1`
export const HAUL_TREE_SRCS = [
  `${import.meta.env.BASE_URL}HaulTreeA.png?v=2`,
  `${import.meta.env.BASE_URL}HaulTreeB.png?v=2`,
  `${import.meta.env.BASE_URL}HaulTreeC.png?v=2`,
] as const
/** Runway tile is 2:1, so travel repeat = 2× path width. */
export const HAUL_RUNWAY_TILE_LEN = PATH_WIDTH * 2

/**
 * Visual-only campus. Grown 2× from the previous aerial boxes, then shifted
 * north/west so south doors still meet the HAUL_START apron. Does not change
 * road tiles, HAUL_PATH, or safe-zone geometry.
 */
const OFFICES_BUILDING = { x: -6, y: 96, width: 108, height: 132 }
const ASSEMBLY_BUILDING = { x: 52, y: 16, width: 168, height: 228 }
const SITE_LOGO_SIZE = 36
const SITE_LOGO_RADIUS = 22
const SITE_LOGO_CX = 26
const SITE_LOGO_CY = 26
const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

interface HaulRoadSceneProps {
  run: RunState
  /** Optional redesigned haul centerline; defaults to HAUL_PATH. */
  haulPath?: Point[]
  onReachedPad: () => void
  /** Mount booster to the launch pad (seats pose + completes haul / auto-advances). */
  onMountToPad: () => void
  /** Booster left the safe road and exploded — fires once the reset animation finishes. */
  onExplode?: () => void
  /** Session timer paused — locks all movement/mount controls until resumed. */
  paused?: boolean
  /** Fires when the operator attempts to move/mount while paused (keyboard bypasses any overlay). */
  onBlockedInteraction?: () => void
}

interface HaulPose {
  x: number
  y: number
  rotation: number
}

/** Scene units per second while an arrow key is held. */
const MOVE_SPEED = 160

/** How long the explosion plays before reset (ms). Keep in sync with App.css. */
const EXPLODE_MS = 550

/** Strongback slide + erect + settle. Step does not advance until this finishes. */
const MOUNT_MS = 2400
const MOUNT_HOLD_MS = 380

/** South-side pad hinge — engine end of the seated booster. */
const ERECTOR_HINGE = {
  x: PAD_SEATED.x,
  y: PAD_SEATED.y + BOOSTER_LENGTH / 2,
}
const ERECTOR_ARM_LEN = BOOSTER_LENGTH * 1.18
const ERECTOR_ARM_HINGE_PCT = 79
const ERECTOR_BASE_SIZE = 26

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpAngle(from: number, to: number, t: number): number {
  const d = ((to - from + 540) % 360) - 180
  return from + d * t
}

function erectPose(t: number): HaulPose {
  const ang = t * PAD_SEATED.rotation
  const rad = (ang * Math.PI) / 180
  const half = BOOSTER_LENGTH / 2
  return {
    x: ERECTOR_HINGE.x - half * Math.cos(rad),
    y: ERECTOR_HINGE.y - half * Math.sin(rad),
    rotation: ang,
  }
}

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

const HAUL_TREES: {
  cx: number
  cy: number
  w: number
  h: number
  src: 0 | 1 | 2
  flip: boolean
}[] = [
  { cx: 338, cy: 246, w: 58, h: 72, src: 2, flip: false },
  { cx: 294, cy: 254, w: 52, h: 76, src: 1, flip: false },
  { cx: 306, cy: 300, w: 70, h: 74, src: 0, flip: true },
  { cx: 346, cy: 292, w: 54, h: 70, src: 2, flip: true },
  { cx: 314, cy: 338, w: 60, h: 72, src: 0, flip: false },
  { cx: 352, cy: 334, w: 50, h: 74, src: 1, flip: true },
]

interface RunwaySegment {
  x: number
  y: number
  angle: number
  len: number
  startTrim: number
  drawLen: number
}

function runwaySegments(path: Point[]): RunwaySegment[] {
  const segs: RunwaySegment[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 0.5) continue
    const startTrim = i === 0 ? 0 : 8
    const endTrim = i === path.length - 2 ? 0 : 8
    segs.push({
      x: a.x,
      y: a.y,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      len,
      startTrim,
      drawLen: Math.max(0, len - startTrim - endTrim),
    })
  }
  return segs
}

function startPose(): HaulPose {
  return {
    x: HAUL_START.x,
    y: HAUL_START.y,
    rotation: HAUL_START.rotation,
  }
}

export function HaulRoadScene({
  run,
  haulPath,
  onReachedPad,
  onMountToPad,
  onExplode,
  paused = false,
  onBlockedInteraction,
}: HaulRoadSceneProps) {
  const texUid = useId().replace(/:/g, '')
  const padClipId = `haul-pad-clip-${texUid}`
  const sceneRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const [pose, setPose] = useState<HaulPose>(startPose)
  const [dragging, setDragging] = useState(false)
  const [exploding, setExploding] = useState(false)
  const [seated, setSeated] = useState(false)
  const [mounting, setMounting] = useState(false)
  const [erectorAngle, setErectorAngle] = useState(0)
  /** Explosions this turn at this step — reset per haul epoch, alongside pose. */
  const [rudCount, setRudCount] = useState(0)
  const dragOffset = useRef<Point>({ x: 0, y: 0 })
  const reachedPadRef = useRef(false)
  const poseRef = useRef<HaulPose>(startPose())
  const keysRef = useRef<Set<string>>(new Set())
  const explodingRef = useRef(false)
  const explodeTimerRef = useRef<number | null>(null)
  const mountRafRef = useRef<number | null>(null)
  const mountFromRef = useRef<HaulPose | null>(null)
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
  const canMove =
    run.status === 'running' && !seated && !exploding && !paused && !mounting
  canMoveRef.current = canMove
  const showMountToPad =
    run.status === 'awaiting_reorient' && !seated && !mounting

  const clearExplodeTimer = useCallback(() => {
    if (explodeTimerRef.current != null) {
      window.clearTimeout(explodeTimerRef.current)
      explodeTimerRef.current = null
    }
  }, [])

  const clearMountRaf = useCallback(() => {
    if (mountRafRef.current != null) {
      window.cancelAnimationFrame(mountRafRef.current)
      mountRafRef.current = null
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
    clearMountRaf()
    explodingRef.current = false
    setExploding(false)
    applyPose(startPose())
    setSeated(false)
    setMounting(false)
    setErectorAngle(0)
    setDragging(false)
    setRudCount(0)
    keysRef.current.clear()
    reachedPadRef.current = false

    // Focus map so arrow keys are clearly received.
    window.requestAnimationFrame(() => {
      sceneRef.current?.focus({ preventScroll: true })
    })
  }, [
    run.status,
    run.currentStepIndex,
    run.completedRuns,
    clearExplodeTimer,
    clearMountRaf,
    applyPose,
  ])

  useEffect(
    () => () => {
      clearExplodeTimer()
      clearMountRaf()
    },
    [clearExplodeTimer, clearMountRaf],
  )

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
    setRudCount((n) => n + 1)
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
      if (pausedRef.current) {
        onBlockedInteraction?.()
        return
      }
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
    if (paused) {
      onBlockedInteraction?.()
      return
    }
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
    if (pausedRef.current) {
      onBlockedInteraction?.()
      return
    }
    if (mounting || seated) return

    clearMountRaf()
    mountFromRef.current = { ...poseRef.current }
    setMounting(true)
    setErectorAngle(0)
    const startedAt = performance.now()
    const liftStart = erectPose(0)

    const tick = (now: number) => {
      const raw = Math.min(1, (now - startedAt) / MOUNT_MS)
      const e = easeInOutCubic(raw)
      const from = mountFromRef.current ?? liftStart
      if (e < 0.28) {
        const t = e / 0.28
        applyPose({
          x: lerp(from.x, liftStart.x, t),
          y: lerp(from.y, liftStart.y, t),
          rotation: lerpAngle(from.rotation, liftStart.rotation, t),
        })
        setErectorAngle(lerpAngle(from.rotation, 0, t))
      } else {
        const t = Math.min(1, (e - 0.28) / 0.72)
        const next = erectPose(t)
        applyPose(next)
        setErectorAngle(next.rotation)
      }
      if (raw < 1) {
        mountRafRef.current = window.requestAnimationFrame(tick)
        return
      }
      applyPose({
        x: PAD_SEATED.x,
        y: PAD_SEATED.y,
        rotation: PAD_SEATED.rotation,
      })
      setErectorAngle(PAD_SEATED.rotation)
      setSeated(true)
      setMounting(false)
      window.setTimeout(() => onMountToPad(), MOUNT_HOLD_MS)
    }
    mountRafRef.current = window.requestAnimationFrame(tick)
  }

  // Discrete nudge for on-screen pad (and reliability when keys are captured).
  const NUDGE = 12

  const pathPoints = pathPolylinePoints(activePath)
  const taxiwaySegs = runwaySegments(activePath)

  return (
    <div className="haul-scene">
      <div className="haul-scene__toolbar">
        <div className="haul-orient" aria-label="Booster orientation">
          <span className="haul-orient__label">Re-orient crawler</span>
          <button
            type="button"
            className="btn btn--primary haul-orient__rotate-btn"
            disabled={!canMove}
            onClick={() => rotateBy(90)}
            title="Rotate crawler 90°"
          >
            ↻ Rotate Crawler
          </button>
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
            disabled={paused}
            onClick={handleMountToPad}
            aria-label="Mount to launch pad"
          >
            Mount to launch pad
          </button>
        )}
        {mounting && (
          <p className="haul-mount-status" aria-live="polite">
            Strongback erecting booster…
          </p>
        )}
      </div>

      <div
        ref={sceneRef}
        className={[
          'haul-map',
          exploding ? 'haul-map--exploding' : '',
          seated ? 'haul-map--seated' : '',
          mounting ? 'haul-map--mounting' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={0}
        role="application"
        aria-label="Haul map — arrow keys move the booster along the road"
        onPointerDown={() => sceneRef.current?.focus({ preventScroll: true })}
      >
        <div className="haul-rud-counter" role="status" aria-live="polite">
          <svg
            className="haul-rud-counter__flame"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="haul-rud-flame-grad"
                x1="0"
                y1="1"
                x2="0"
                y2="0"
              >
                <stop offset="0%" stopColor="#ff5a1f" />
                <stop offset="55%" stopColor="#ffa733" />
                <stop offset="100%" stopColor="#ffe27a" />
              </linearGradient>
            </defs>
            <path
              d="M10 1 Q13 5 12 8 Q15 7 14 4 Q17 8 17 12 A7 7 0 1 1 3 12 Q3 8 6 4 Q5 7 8 8 Q7 5 10 1 Z"
              fill="url(#haul-rud-flame-grad)"
            />
          </svg>
          <span className="haul-rud-counter__label">
            Rapid Unplanned Disassembly
          </span>
          <span className="haul-rud-counter__count">{rudCount}</span>
        </div>

        <svg
          className="haul-map__svg"
          viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="haul-field-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="50%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(10, 28, 8, 0.35)" />
            </radialGradient>
            <clipPath id={padClipId}>
              <rect
                x={LAUNCH_PAD.x}
                y={LAUNCH_PAD.y}
                width={LAUNCH_PAD.width}
                height={LAUNCH_PAD.height}
                rx="6"
              />
            </clipPath>
          </defs>

          <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="#3a4a32" />
          <image
            href={HAUL_GRASS_SRC}
            xlinkHref={HAUL_GRASS_SRC}
            x={0}
            y={0}
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
          />

          <image
            className="haul-coast"
            href={HAUL_COAST_SRC}
            xlinkHref={HAUL_COAST_SRC}
            x={SAND_X}
            y={0}
            width={SCENE_WIDTH - SAND_X}
            height={SCENE_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />

          <rect
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fill="url(#haul-field-vignette)"
          />

          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(12, 14, 16, 0.92)"
            strokeWidth={PATH_WIDTH + 14}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {taxiwaySegs.map((seg, i) => {
            if (seg.drawLen <= 1) return null
            const tiles = Math.max(1, Math.ceil(seg.len / HAUL_RUNWAY_TILE_LEN) + 1)
            return (
              <g
                key={`seg-${i}`}
                transform={`translate(${seg.x} ${seg.y}) rotate(${seg.angle})`}
              >
                <svg
                  x={seg.startTrim}
                  y={-PATH_HALF}
                  width={seg.drawLen}
                  height={PATH_WIDTH}
                  overflow="hidden"
                >
                  {Array.from({ length: tiles }, (_, t) => (
                    <image
                      key={t}
                      href={HAUL_RUNWAY_SRC}
                      xlinkHref={HAUL_RUNWAY_SRC}
                      x={t * HAUL_RUNWAY_TILE_LEN - seg.startTrim}
                      y={0}
                      width={HAUL_RUNWAY_TILE_LEN}
                      height={PATH_WIDTH}
                      preserveAspectRatio="none"
                    />
                  ))}
                </svg>
              </g>
            )
          })}


          <g className="haul-trees" aria-hidden="true">
            {/*
              Fixed decorative obstacle in the open grass pocket between the
              Assembly building and the road's loop around it (scene rect
              x=280–360, y=240–360 — matches roadGrid.ts TREE_CLUSTER_CELLS,
              cols 7–8 / rows 6–8, a 2x3 block). Purely visual: this pocket
              is already outside the drivable safe corridor, and the
              matching grid cells are locked from being painted as road in
              the To-be redesign workshop.
            */}
            {/*
              Scene trees stay modest (execute / redesign haul preview).
              Redesign grid cell trees are styled separately in App.css and
              remain larger for map readability.
            */}
            {HAUL_TREES.map((tree, i) => (
              <g
                key={i}
                transform={`translate(${tree.cx}, ${tree.cy})${tree.flip ? ' scale(-1 1)' : ''}`}
              >
                <ellipse
                  cx="0"
                  cy={tree.h * 0.08}
                  rx={tree.w * 0.38}
                  ry={tree.h * 0.1}
                  fill="rgba(4, 12, 3, 0.45)"
                />
                <image
                  href={HAUL_TREE_SRCS[tree.src]}
                  xlinkHref={HAUL_TREE_SRCS[tree.src]}
                  x={-tree.w / 2}
                  y={-tree.h * 0.9}
                  width={tree.w}
                  height={tree.h}
                  preserveAspectRatio="xMidYMax meet"
                />
              </g>
            ))}
          </g>

          {/*
            Ambient life + dirt service track (decorative, non-interactive).
            Layer order matters: dirt → people → buildings so walkers
            disappear under the façades when they enter a doorway.
            Never read by isBoosterSafe / isPointSafe.
          */}
          {/*
            Curved dirt track: Offices door → yard → Assembly door.
            Offices door ~ (48, 228); Assembly door ~ (136, 244).
          */}
          <g className="haul-npc-dirt-road" aria-hidden="true">
            <path
              className="haul-npc-dirt-road__bed"
              d="M 48 228
                 L 48 258
                 Q 48 270 60 270
                 L 124 270
                 Q 136 270 136 258
                 L 136 244"
              fill="none"
              stroke="#6b5a3e"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.92"
            />
            <path
              className="haul-npc-dirt-road__highlight"
              d="M 48 228
                 L 48 258
                 Q 48 270 60 270
                 L 124 270
                 Q 136 270 136 258
                 L 136 244"
              fill="none"
              stroke="#8a7550"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <path
              d="M 50 232 L 50 256 Q 50 268 62 268 L 122 268 Q 134 268 134 256 L 134 246"
              fill="none"
              stroke="#5a4a32"
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M 54 260 Q 80 276 110 272 T 140 258"
              fill="none"
              stroke="#9a8460"
              strokeWidth="0.55"
              strokeLinecap="round"
              opacity="0.32"
            />
          </g>

          {/* People drawn under buildings so they vanish into doorways. */}
          <g className="haul-npc-people" aria-hidden="true">
            <circle
              className="haul-npc-person haul-npc-person--1"
              cx="48"
              cy="252"
              r="2.3"
              fill="#cbd5df"
              stroke="#5a6672"
              strokeWidth="1"
            />
            <circle
              className="haul-npc-person haul-npc-person--2"
              cx="54"
              cy="254"
              r="2.2"
              fill="#d8c9a3"
              stroke="#6b5d42"
              strokeWidth="1"
            />
            <circle
              className="haul-npc-person haul-npc-person--3"
              cx="136"
              cy="256"
              r="2.3"
              fill="#c9a8c0"
              stroke="#6a4f63"
              strokeWidth="1"
            />
          </g>

          {/*
            High-angle aerial building sprites. Drawn after people so walkers
            vanish under the façades at doorways. preserveAspectRatio xMidYMax
            keeps each south door on the apron.
          */}
          <g className="haul-building haul-building--offices" aria-hidden="true">
            <image
              href={HAUL_OFFICES_SRC}
              xlinkHref={HAUL_OFFICES_SRC}
              x={OFFICES_BUILDING.x}
              y={OFFICES_BUILDING.y}
              width={OFFICES_BUILDING.width}
              height={OFFICES_BUILDING.height}
              preserveAspectRatio="xMidYMax meet"
              style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}
            />
            <text
              x={28}
              y={OFFICES_BUILDING.y + 16}
              textAnchor="middle"
              fill="#e8f0e4"
              fontSize="10"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="700"
              letterSpacing="0.5"
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 2.5 }}
            >
              Offices
            </text>
          </g>

          <g className="haul-building haul-building--assembly" aria-hidden="true">
            <image
              href={HAUL_ASSEMBLY_SRC}
              xlinkHref={HAUL_ASSEMBLY_SRC}
              x={ASSEMBLY_BUILDING.x}
              y={ASSEMBLY_BUILDING.y}
              width={ASSEMBLY_BUILDING.width}
              height={ASSEMBLY_BUILDING.height}
              preserveAspectRatio="xMidYMax meet"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.55))' }}
            />
            <text
              x={ASSEMBLY_BUILDING.x + ASSEMBLY_BUILDING.width / 2}
              y={ASSEMBLY_BUILDING.y + 28}
              textAnchor="middle"
              fill="#e8f0e4"
              fontSize="11"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontWeight="700"
              style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 2.5 }}
            >
              Assembly
            </text>
          </g>

          <g className="haul-site-logo" aria-hidden="true">
            <circle
              cx={SITE_LOGO_CX}
              cy={SITE_LOGO_CY}
              r={SITE_LOGO_RADIUS}
              fill="#ffffff"
            />
            <image
              href={ORBIT_LOGO_SRC}
              xlinkHref={ORBIT_LOGO_SRC}
              x={SITE_LOGO_CX - SITE_LOGO_SIZE / 2}
              y={SITE_LOGO_CY - SITE_LOGO_SIZE / 2}
              width={SITE_LOGO_SIZE}
              height={SITE_LOGO_SIZE}
            />
          </g>

          <g className="haul-npc-traffic" aria-hidden="true">
            <rect
              className="haul-npc-vehicle"
              x="34"
              y="266.5"
              width="12"
              height="7"
              rx="1.5"
              fill="#4a4f56"
              stroke="#25292f"
              strokeWidth="1"
            />
          </g>

          <g className="haul-pad">
            <g clipPath={`url(#${padClipId})`}>
              <image
                href={HAUL_PAD_SRC}
                xlinkHref={HAUL_PAD_SRC}
                x={LAUNCH_PAD.x}
                y={LAUNCH_PAD.y}
                width={LAUNCH_PAD.width}
                height={LAUNCH_PAD.height}
                preserveAspectRatio="xMidYMid slice"
              />
              {(locked || seated) && (
                <rect
                  x={LAUNCH_PAD.x}
                  y={LAUNCH_PAD.y}
                  width={LAUNCH_PAD.width}
                  height={LAUNCH_PAD.height}
                  fill="rgba(59, 130, 196, 0.28)"
                />
              )}
            </g>
            <rect
              x={LAUNCH_PAD.x}
              y={LAUNCH_PAD.y}
              width={LAUNCH_PAD.width}
              height={LAUNCH_PAD.height}
              rx="6"
              fill="none"
              stroke={locked || seated ? '#5ba3e0' : '#8a929c'}
              strokeWidth="2"
            />
            {/*
              Pad markings behind the logo: a solid yellow ring around a
              solid white disc, like a helipad target — gives the logo a
              clean, legible backdrop against the pad's dark/blue fill and
              reads more clearly as a landing pad.
            */}
            <circle
              cx={PAD_SEATED.x}
              cy={PAD_SEATED.y}
              r="40"
              fill="#ffc627"
            />
            <circle
              cx={PAD_SEATED.x}
              cy={PAD_SEATED.y}
              r="32"
              fill="#ffffff"
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

          {/*
            Fixed launch tower beside the pad, on the side toward the sea
            (right/east). Flat shapes only (no real isometric engine) but
            shaded — a lighter "top" face and a darker "side" face on the
            foundation block, plus a shadowed right-hand rail on the mast —
            enough offset/shading to read as rudimentary 3D rather than a
            flat silhouette. y is set so the foundation block's base (local
            y=116) lines up with the pad-seated circle/logo's vertical
            centre (PAD_SEATED.y) — since the tower is meant to read as a 3D
            object anyway, its mast riding up over the pad's top edge into
            the sea/sky backdrop above is intentional, not a bug.
          */}
          <g
            className="haul-launch-tower"
            aria-hidden="true"
            transform={`translate(${LAUNCH_PAD.x + LAUNCH_PAD.width - 15}, ${PAD_SEATED.y - 116})`}
          >
            <ellipse cx="12" cy="119" rx="20" ry="6" fill="rgba(4, 12, 3, 0.35)" />

            {/*
              Soft halo behind the mast so its rails read clearly against the
              pad's own dark fill where the two overlap.
            */}
            <rect x="-2" y="-16" width="26" height="118" fill="rgba(180, 190, 200, 0.14)" />

            {/* Foundation block — front / top / side faces */}
            <polygon points="0,100 22,100 28,94 6,94" fill="#7d858e" />
            <rect x="0" y="100" width="22" height="16" fill="#454c55" stroke="#9aa1a8" />
            <polygon points="22,100 22,116 28,110 28,94" fill="#2e3339" />

            {/* Mast rails — right rail shadowed for a hint of depth */}
            <rect x="4" y="0" width="3.5" height="100" fill="#a7aeb6" stroke="#5a6168" strokeWidth="0.5" />
            <rect x="18" y="0" width="3.5" height="100" fill="#5a6168" stroke="#31363c" strokeWidth="0.5" />

            {/* Lattice rungs + alternating cross-braces */}
            {[10, 30, 50, 70, 90].map((y, i) => (
              <g key={y}>
                <line x1="5.5" y1={y} x2="19.5" y2={y} stroke="#c7ccd2" strokeWidth="1.6" />
                {i % 2 === 0 ? (
                  <line x1="5.5" y1={y} x2="19.5" y2={y + 20} stroke="#8a919a" strokeWidth="1.4" />
                ) : (
                  <line x1="19.5" y1={y} x2="5.5" y2={y + 20} stroke="#8a919a" strokeWidth="1.4" />
                )}
              </g>
            ))}

            {/* Umbilical arm reaching back toward the pad/rocket */}
            <line x1="4" y1="45" x2="-16" y2="45" stroke="#a7aeb6" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="-16" y1="45" x2="-16" y2="52" stroke="#a7aeb6" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="-17.5" y="43" width="3" height="4" fill="#e63935" />

            {/* Lightning rod + blinking obstruction beacon up top */}
            <line x1="11" y1="-12" x2="11" y2="0" stroke="#c7ccd2" strokeWidth="1.5" />
            <circle cx="11" cy="-13" r="2" fill="#f0f2f4" stroke="#6b7280" />
            <circle
              className="haul-launch-tower__beacon-glow"
              cx="11"
              cy="20"
              r="6"
              fill="rgba(255, 60, 60, 0.35)"
            />
            <circle className="haul-launch-tower__beacon" cx="11" cy="20" r="2.4" fill="#ff4d4d" />
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

        {(mounting || seated) && (
          <div className="haul-erector" aria-hidden="true">
            <img
              className="haul-erector__base"
              src={HAUL_ERECTOR_BASE_SRC}
              alt=""
              style={{
                left: `${(ERECTOR_HINGE.x / SCENE_WIDTH) * 100}%`,
                top: `${(ERECTOR_HINGE.y / SCENE_HEIGHT) * 100}%`,
                width: `${(ERECTOR_BASE_SIZE / SCENE_WIDTH) * 100}%`,
              }}
            />
            <img
              className="haul-erector__arm"
              src={HAUL_ERECTOR_ARM_SRC}
              alt=""
              style={{
                left: `${(ERECTOR_HINGE.x / SCENE_WIDTH) * 100}%`,
                top: `${(ERECTOR_HINGE.y / SCENE_HEIGHT) * 100}%`,
                width: `${(ERECTOR_ARM_LEN / SCENE_WIDTH) * 100}%`,
                transform: `translate(-${ERECTOR_ARM_HINGE_PCT}%, -50%) rotate(${erectorAngle}deg)`,
                transformOrigin: `${ERECTOR_ARM_HINGE_PCT}% 50%`,
              }}
            />
          </div>
        )}

        <div
          className={[
            'haul-booster',
            dragging ? 'haul-booster--dragging' : '',
            canMove ? 'haul-booster--draggable' : '',
            seated ? 'haul-booster--seated' : '',
            mounting ? 'haul-booster--mounting' : '',
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
          {!exploding && !mounting && !seated && (
            <div className="haul-crawler" aria-hidden="true" />
          )}
          {!exploding && (
            /* Same bare-booster HD sprite as manufacture (showNose=false → AssemblyBooster.png). */
            <Booster
              className="booster--haul booster--haul-sprite"
              showNose={false}
              multiNozzleEngine
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
