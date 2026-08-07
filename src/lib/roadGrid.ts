import {
  HAUL_PATH,
  HAUL_START,
  LAUNCH_PAD,
  PAD_SEATED,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  type Point,
} from './pathGeometry'

export const ROAD_COLS = 20
export const ROAD_ROWS = 12

export type CellKey = `${number},${number}`

export function cellKey(col: number, row: number): CellKey {
  return `${col},${row}`
}

/**
 * Fixed decorative tree cluster in the open grass pocket between the
 * Assembly building and the road's loop around it (scene x=280–360,
 * y=240–360 — well inside the pocket bounded by road cells at col 5,
 * col 10, and row 9; row 6 there is clear too — the baseline road's row-6
 * segment only spans cols 2–5). 2x3 block, cols 7–8 x rows 6–8. Permanent
 * obstacle: never toggleable as road in the redesign grid, and never part
 * of the rasterized baseline path.
 */
export const TREE_CLUSTER_CELLS: CellKey[] = [
  cellKey(7, 6),
  cellKey(8, 6),
  cellKey(7, 7),
  cellKey(8, 7),
  cellKey(7, 8),
  cellKey(8, 8),
]

export function parseCellKey(key: string): { col: number; row: number } {
  const [c, r] = key.split(',').map(Number)
  return { col: c, row: r }
}

export function cellCenter(col: number, row: number): Point {
  const cw = SCENE_WIDTH / ROAD_COLS
  const rh = SCENE_HEIGHT / ROAD_ROWS
  return {
    x: (col + 0.5) * cw,
    y: (row + 0.5) * rh,
  }
}

export function pointToCell(p: Point): { col: number; row: number } {
  const cw = SCENE_WIDTH / ROAD_COLS
  const rh = SCENE_HEIGHT / ROAD_ROWS
  const col = Math.min(ROAD_COLS - 1, Math.max(0, Math.floor(p.x / cw)))
  const row = Math.min(ROAD_ROWS - 1, Math.max(0, Math.floor(p.y / rh)))
  return { col, row }
}

/** Cells that must stay road-linked: assembly exit and pad centre. */
export function requiredEndpointCells(): { start: CellKey; end: CellKey } {
  const s = pointToCell(HAUL_START)
  const e = pointToCell({
    x: PAD_SEATED.x,
    y: PAD_SEATED.y,
  })
  return { start: cellKey(s.col, s.row), end: cellKey(e.col, e.row) }
}

/** Rasterise a polyline onto grid cells (for seeding the winding baseline road). */
export function rasterizePath(path: Point[] = HAUL_PATH): Set<CellKey> {
  const cells = new Set<CellKey>()
  const { start, end } = requiredEndpointCells()
  cells.add(start)
  cells.add(end)

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]
    const b = path[i + 1]
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12),
    )
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      const { col, row } = pointToCell(p)
      cells.add(cellKey(col, row))
    }
  }
  return cells
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/**
 * BFS through selected road tiles from start to end.
 * Returns scene-space centerline points, or null if disconnected.
 */
export function pathFromRoadTiles(tiles: Set<CellKey>): Point[] | null {
  const { start, end } = requiredEndpointCells()
  if (!tiles.has(start) || !tiles.has(end)) return null

  const prev = new Map<CellKey, CellKey | null>()
  const q: CellKey[] = [start]
  prev.set(start, null)

  while (q.length > 0) {
    const cur = q.shift()!
    if (cur === end) break
    const { col, row } = parseCellKey(cur)
    for (const [dc, dr] of NEIGHBOURS) {
      const nc = col + dc
      const nr = row + dr
      if (nc < 0 || nr < 0 || nc >= ROAD_COLS || nr >= ROAD_ROWS) continue
      const nk = cellKey(nc, nr)
      if (!tiles.has(nk) || prev.has(nk)) continue
      prev.set(nk, cur)
      q.push(nk)
    }
  }

  if (!prev.has(end)) return null

  const chain: CellKey[] = []
  let walk: CellKey | null = end
  while (walk) {
    chain.push(walk)
    walk = prev.get(walk) ?? null
  }
  chain.reverse()

  const points = chain.map((k) => {
    const { col, row } = parseCellKey(k)
    return cellCenter(col, row)
  })

  // Anchor ends to known poses for smoother entry/exit.
  if (points.length > 0) {
    points[0] = { x: HAUL_START.x, y: HAUL_START.y }
    points[points.length - 1] = {
      x: LAUNCH_PAD.x + LAUNCH_PAD.width * 0.35,
      y: PAD_SEATED.y,
    }
  }

  return points
}

/** Paint a straight orthognal corridor from assembly to pad (utility / tests). */
export function straightRoadTiles(): Set<CellKey> {
  const { start, end } = requiredEndpointCells()
  const a = parseCellKey(start)
  const b = parseCellKey(end)
  const cells = new Set<CellKey>()
  // Horizontal then vertical (simple L or straight if aligned).
  let c = a.col
  let r = a.row
  cells.add(cellKey(c, r))
  while (c !== b.col) {
    c += c < b.col ? 1 : -1
    cells.add(cellKey(c, r))
  }
  while (r !== b.row) {
    r += r < b.row ? 1 : -1
    cells.add(cellKey(c, r))
  }
  return cells
}

/**
 * Cost points charged per painted road tile (excluding fixed endpoints).
 * Formula: roadCost = billableRoadTileCount(tiles) × ROAD_COST_PER_TILE
 * Assembly exit + Launch Pad tiles are free (not removable).
 */
export const ROAD_COST_PER_TILE = 10

/** Count road tiles that cost points (all painted tiles except the two endpoints). */
export function billableRoadTileCount(tiles: Set<CellKey>): number {
  const { start, end } = requiredEndpointCells()
  let n = 0
  for (const k of tiles) {
    if (k !== start && k !== end) n += 1
  }
  return n
}

/** Total road construction cost for the painted tile set. */
export function roadCostFromTiles(tiles: Set<CellKey>): number {
  return billableRoadTileCount(tiles) * ROAD_COST_PER_TILE
}
