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

/** Scene size used by the integrate-payload map (SVG user units). */
export const SCENE_WIDTH = 800
export const SCENE_HEIGHT = 480

/**
 * Booster footprint in scene units (horizontal orientation = 0°).
 * Path corridor is 50% wider than the booster's short side.
 */
export const BOOSTER_LENGTH = 96
export const BOOSTER_WIDTH = 32
export const PATH_WIDTH = BOOSTER_WIDTH * 1.5
export const PATH_HALF = PATH_WIDTH / 2

/**
 * Forgiveness band of grass adjacent to the road that still counts as safe.
 * Effective path half-width = PATH_HALF + GRASS_MARGIN.
 */
export const GRASS_MARGIN = 6

/** Start pose at the Assembly building exit. */
export const HAUL_START: Point & { rotation: number } = {
  x: 95,
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
 * Assembly building + exit apron (scene units).
 * Covers the visual building and the apron that joins it to the path start so
 * the full booster footprint at HAUL_START is safe.
 */
export const ASSEMBLY_SAFE: Rect = {
  x: 10,
  y: 160,
  width: 150,
  height: 160,
}

/** Launch pad rectangle (scene units) — visual + safe zone. */
export const LAUNCH_PAD: Rect = {
  x: 655,
  y: 230,
  width: 120,
  height: 100,
}

/** Final seated pose after reorient on the pad. */
export const PAD_SEATED = {
  x: LAUNCH_PAD.x + LAUNCH_PAD.width / 2,
  y: LAUNCH_PAD.y + LAUNCH_PAD.height / 2,
  rotation: -90,
}

export function clampRotation(deg: number): number {
  const n = ((deg % 360) + 360) % 360
  // Prefer -90 over 270 for upright pad display
  return n === 270 ? -90 : n > 180 ? n - 360 : n
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

export function pointInRect(p: Point, r: Rect): boolean {
  return (
    p.x >= r.x &&
    p.x <= r.x + r.width &&
    p.y >= r.y &&
    p.y <= r.y + r.height
  )
}

/** Effective half-width of the road corridor including grass forgiveness. */
export const PATH_SAFE_HALF = PATH_HALF + GRASS_MARGIN

/** True if a sample is on the road corridor (with grass margin). */
export function isPointOnSafePath(
  p: Point,
  path: Point[] = HAUL_PATH,
): boolean {
  return distanceToPath(p, path) <= PATH_SAFE_HALF + 0.5
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
 * Sample points across the booster footprint (center, corners, edge quarters,
 * interior ring) so mid-body clipping is not missed on turns.
 */
export function boosterFootprintSamples(
  center: Point,
  rotation: number,
): Point[] {
  const corners = boosterCorners(center, rotation)
  const samples: Point[] = [center, ...corners]

  // Edge samples at 25% / 50% / 75% along each side
  for (let i = 0; i < 4; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % 4]
    for (const t of [0.25, 0.5, 0.75]) {
      samples.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      })
    }
  }

  // Interior ring between center and corners (catches mid-body clipping)
  for (const c of corners) {
    samples.push({
      x: center.x + (c.x - center.x) * 0.5,
      y: center.y + (c.y - center.y) * 0.5,
    })
  }

  return samples
}

/**
 * Booster is safe when every footprint sample is inside at least one safe
 * region (path-with-margin OR assembly OR pad). Explode only when a sample
 * lies in pure grass.
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
  const points = [center, ...boosterCorners(center, rotation)]
  return points.some((p) => pointInRect(p, LAUNCH_PAD))
}

/** SVG path `d` for a rounded corridor outline (visual only). */
export function pathPolylinePoints(path: Point[] = HAUL_PATH): string {
  return path.map((p) => `${p.x},${p.y}`).join(' ')
}
