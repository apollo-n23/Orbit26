export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Scene size used by the haul-road map (SVG user units). */
export const SCENE_WIDTH = 800
export const SCENE_HEIGHT = 480

/**
 * Booster footprint in scene units (horizontal orientation = 0°).
 * Visual path stroke is 50% wider than the booster's short side.
 */
export const BOOSTER_LENGTH = 96
export const BOOSTER_WIDTH = 32
export const PATH_WIDTH = BOOSTER_WIDTH * 1.5
export const PATH_HALF = PATH_WIDTH / 2

/**
 * Grass forgiveness beside the painted road.
 * Combined with PATH_HALF so the booster can track the corridor without
 * hair-trigger explosions on the verge.
 */
export const GRASS_MARGIN = 14

/** Effective half-width of the road safe corridor. */
export const PATH_SAFE_HALF = PATH_HALF + GRASS_MARGIN

/**
 * Extra radius at path vertices so the long booster can negotiate corners
 * after re-orienting (outer fillet of the L-turns).
 */
export const PATH_CORNER_EXTRA = 28

/** Start pose at the Assembly building exit. */
export const HAUL_START: Point & { rotation: number } = {
  x: 110,
  y: 240,
  rotation: 0,
}

/** Winding centerline: Assembly → Launch Pad. */
export const HAUL_PATH: Point[] = [
  { x: 95, y: 240 },
  { x: 220, y: 240 },
  { x: 220, y: 380 },
  { x: 400, y: 380 },
  { x: 400, y: 120 },
  { x: 600, y: 120 },
  { x: 600, y: 280 },
  { x: 700, y: 280 },
]

/**
 * Assembly building + generous exit apron so the full booster footprint at
 * start (and first metres of travel) is safe.
 */
export const ASSEMBLY_SAFE: Rect = {
  x: 0,
  y: 140,
  width: 200,
  height: 200,
}

/** Launch pad rectangle (scene units) — visual + safe zone (slightly padded). */
export const LAUNCH_PAD: Rect = {
  x: 640,
  y: 215,
  width: 145,
  height: 130,
}

/** Final seated pose after mounting to the launch pad. */
export const PAD_SEATED = {
  x: LAUNCH_PAD.x + LAUNCH_PAD.width / 2,
  y: LAUNCH_PAD.y + LAUNCH_PAD.height / 2,
  rotation: -90,
}

export function clampRotation(deg: number): number {
  const n = ((deg % 360) + 360) % 360
  return n > 180 ? n - 360 : n
}

export function rotatePoint(p: Point, origin: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  }
}

/** Four corners of the booster at center + rotation. */
export function boosterCorners(center: Point, rotation: number): Point[] {
  const hl = BOOSTER_LENGTH / 2
  const hw = BOOSTER_WIDTH / 2
  const local = [
    { x: center.x - hl, y: center.y - hw },
    { x: center.x + hl, y: center.y - hw },
    { x: center.x + hl, y: center.y + hw },
    { x: center.x - hl, y: center.y + hw },
  ]
  return local.map((p) => rotatePoint(p, center, rotation))
}

function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** Closest point on segment AB to P. */
export function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return { ...a }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + t * abx, y: a.y + t * aby }
}

/** Minimum distance from point to the polyline path. */
export function distanceToPath(p: Point, path: Point[]): number {
  let best = Infinity
  for (let i = 0; i < path.length - 1; i++) {
    const c = closestOnSegment(p, path[i], path[i + 1])
    const d = Math.sqrt(dist2(p, c))
    if (d < best) best = d
  }
  return best
}

/** Distance to nearest path vertex (corner hubs). */
export function distanceToPathVertex(p: Point, path: Point[]): number {
  let best = Infinity
  for (const v of path) {
    const d = Math.sqrt(dist2(p, v))
    if (d < best) best = d
  }
  return best
}

export function pointInRect(p: Point, r: Rect): boolean {
  return (
    p.x >= r.x &&
    p.x <= r.x + r.width &&
    p.y >= r.y &&
    p.y <= r.y + r.height
  )
}

/** True if a sample is on the road corridor (with grass margin + corner fillets). */
export function isPointOnSafePath(
  p: Point,
  path: Point[] = HAUL_PATH,
): boolean {
  if (distanceToPath(p, path) <= PATH_SAFE_HALF + 0.5) return true
  // Rounded outer corners: extra safe disc at each path vertex
  if (distanceToPathVertex(p, path) <= PATH_SAFE_HALF + PATH_CORNER_EXTRA) {
    return true
  }
  return false
}

/**
 * True if a sample is inside any safe region: path (+ margin), assembly, or pad.
 * Pure grass (outside all safe zones) is unsafe.
 */
export function isPointSafe(p: Point, path: Point[] = HAUL_PATH): boolean {
  return (
    isPointOnSafePath(p, path) ||
    pointInRect(p, ASSEMBLY_SAFE) ||
    pointInRect(p, LAUNCH_PAD)
  )
}

/**
 * Sample points across the booster footprint.
 * Dense enough to catch grass contact; not so harsh as continuous geometry.
 */
export function boosterFootprintSamples(
  center: Point,
  rotation: number,
): Point[] {
  const corners = boosterCorners(center, rotation)
  const samples: Point[] = [center, ...corners]

  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    for (const t of [0.5]) {
      samples.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      })
    }
  }

  return samples
}

/**
 * Booster is safe when every footprint sample is inside at least one safe
 * region (path-with-margin OR assembly OR pad). Explode only on pure grass.
 */
export function isBoosterSafe(
  center: Point,
  rotation: number,
  path: Point[] = HAUL_PATH,
): boolean {
  return boosterFootprintSamples(center, rotation).every((s) =>
    isPointSafe(s, path),
  )
}

export function boosterTouchesPad(center: Point, rotation: number): boolean {
  // Center or any corner on the pad counts as arrival
  const points = [center, ...boosterCorners(center, rotation)]
  return points.some((p) => pointInRect(p, LAUNCH_PAD))
}

/** SVG path points string for polylines. */
export function pathPolylinePoints(path: Point[] = HAUL_PATH): string {
  return path.map((p) => `${p.x},${p.y}`).join(' ')
}
