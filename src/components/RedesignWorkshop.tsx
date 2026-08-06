import { useMemo, useState } from 'react'
import type { ProcessMachine, ProcessVersion } from '../types/process'
import {
  applyAutoMoveBooster,
  applyHaulPath,
  applyMachineLineOrder,
  applyMachineParkOffset,
  getHaulStep,
  getManufactureStep,
  resolveAutoMoveBooster,
} from '../lib/processEdit'
import { Booster } from './Booster'
import {
  ROAD_COLS,
  ROAD_ROWS,
  cellKey,
  pathFromRoadTiles,
  rasterizePath,
  requiredEndpointCells,
  straightRoadTiles,
  type CellKey,
} from '../lib/roadGrid'
import { HAUL_PATH, SCENE_HEIGHT, SCENE_WIDTH } from '../lib/pathGeometry'

type RedesignTab = 'manufacture' | 'haul'

interface RedesignWorkshopProps {
  initialProcess: ProcessVersion
  roundLabel: string
  onConfirm: (process: ProcessVersion) => void
}

export function RedesignWorkshop({
  initialProcess,
  roundLabel,
  onConfirm,
}: RedesignWorkshopProps) {
  const [draft, setDraft] = useState<ProcessVersion>(() =>
    structuredClone(initialProcess),
  )
  const [tab, setTab] = useState<RedesignTab>('manufacture')
  const [roadError, setRoadError] = useState<string | null>(null)

  const haulDefaultPath = getHaulStep(initialProcess)?.haulPath ?? HAUL_PATH
  const [roadTiles, setRoadTiles] = useState<Set<CellKey>>(() =>
    rasterizePath(haulDefaultPath),
  )

  const machinesSorted = useMemo(() => {
    const mfg = getManufactureStep(draft)
    const list = mfg?.machines ?? []
    return [...list].sort((a, b) => a.linePosition - b.linePosition)
  }, [draft])

  const autoMoveBooster = resolveAutoMoveBooster(draft)
  const endpoints = requiredEndpointCells()

  function handleDropOnSlot(targetSlotIndex: number, machineId: string) {
    if (!machineId) return
    const ordered = machinesSorted.map((m) => m.id)
    if (!ordered.includes(machineId)) return
    // Rebuild left→right order: remove, then insert at the drop slot.
    const next = ordered.filter((id) => id !== machineId)
    const insertAt = Math.max(0, Math.min(targetSlotIndex, next.length))
    next.splice(insertAt, 0, machineId)
    setDraft((p) => applyMachineLineOrder(p, next))
  }

  function handleParkChange(machineId: string, value: number) {
    setDraft((p) => applyMachineParkOffset(p, machineId, value))
  }

  function handleToggleAutoMove() {
    setDraft((p) => applyAutoMoveBooster(p, !resolveAutoMoveBooster(p)))
  }

  function toggleTile(col: number, row: number) {
    const key = cellKey(col, row)
    // Endpoints stay on.
    if (key === endpoints.start || key === endpoints.end) return
    setRoadTiles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setRoadError(null)
  }

  function paintStraight() {
    setRoadTiles(straightRoadTiles())
    setRoadError(null)
  }

  function resetWindingRoad() {
    setRoadTiles(rasterizePath(HAUL_PATH))
    setRoadError(null)
  }

  function handleConfirm() {
    const path = pathFromRoadTiles(roadTiles)
    if (!path || path.length < 2) {
      setRoadError(
        'Road must connect Assembly to the Launch Pad. Paint a continuous path (or use Straight road).',
      )
      setTab('haul')
      return
    }
    // Always start from a fresh clone of the manufacture draft, then stamp the road.
    const withRoad = applyHaulPath(structuredClone(draft), path)
    const stored = withRoad.haulPathOverride ?? getHaulStep(withRoad)?.haulPath
    if (!stored || stored.length < 2) {
      setRoadError('Could not save road layout. Try Straight road, then confirm again.')
      setTab('haul')
      return
    }
    onConfirm(withRoad)
  }

  return (
    <section className="view-panel redesign-workshop" aria-labelledby="redesign-heading">
      <header className="view-panel__header sim-header">
        <div>
          <h2 id="redesign-heading">Redesign process</h2>
          <p className="view-panel__lede">
            {roundLabel} — improve the layout before the three launches. Changes
            are saved for this round only.
          </p>
        </div>
        <div className="sim-header__controls">
          <button type="button" className="btn btn--primary" onClick={handleConfirm}>
            Confirm layout & start launches
          </button>
        </div>
      </header>

      <div className="view-panel__body redesign-body">
        <nav className="redesign-tabs" aria-label="Redesign steps">
          <button
            type="button"
            className={
              tab === 'manufacture'
                ? 'redesign-tabs__btn redesign-tabs__btn--active'
                : 'redesign-tabs__btn'
            }
            onClick={() => setTab('manufacture')}
          >
            1 · Manufacture line
          </button>
          <button
            type="button"
            className={
              tab === 'haul'
                ? 'redesign-tabs__btn redesign-tabs__btn--active'
                : 'redesign-tabs__btn'
            }
            onClick={() => setTab('haul')}
          >
            2 · Haul road
          </button>
          <span className="redesign-tabs__soon">3–4 · Coming later</span>
        </nav>

        {tab === 'manufacture' && (
          <div className="redesign-mfg">
            <p className="redesign-hint">
              Drag stations left/right to set line order (physical layout). Use
              the distance slider to park each machine closer to or further from
              the belt. Hover the booster on the line to unlock an auto-transfer
              upgrade. Operate sequence numbers stay on each machine.
            </p>
            <div className="redesign-mfg__line" aria-label="Production line slots">
              <div className="redesign-mfg__belt" aria-hidden="true" />
              <div
                className="redesign-mfg__slots"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(machinesSorted.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {machinesSorted.map((machine, slot) => (
                  <MachineSlot
                    key={machine.id}
                    machine={machine}
                    slotIndex={slot}
                    onDrop={(machineId) => handleDropOnSlot(slot, machineId)}
                    onParkChange={(v) => handleParkChange(machine.id, v)}
                  />
                ))}
              </div>
              <div
                className={[
                  'redesign-booster-upgrade',
                  autoMoveBooster ? 'redesign-booster-upgrade--on' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="redesign-booster-upgrade__unit">
                  <Booster
                    className="booster--redesign"
                    label="Booster — hover for transfer upgrade"
                  />
                  <div className="redesign-booster-upgrade__panel">
                    <p className="redesign-booster-upgrade__title">
                      {autoMoveBooster
                        ? 'Auto-transfer enabled'
                        : 'Transfer upgrade'}
                    </p>
                    <p className="redesign-booster-upgrade__copy">
                      {autoMoveBooster
                        ? 'After each machine finishes, the booster moves to the next station automatically during launches.'
                        : 'Upgrade the booster so it auto-moves to the next station when a machine completes its task.'}
                    </p>
                    <button
                      type="button"
                      className={
                        autoMoveBooster
                          ? 'btn btn--ghost'
                          : 'btn btn--primary'
                      }
                      onClick={handleToggleAutoMove}
                    >
                      {autoMoveBooster
                        ? 'Disable auto-transfer'
                        : 'Enable auto-transfer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'haul' && (
          <div className="redesign-haul">
            <p className="redesign-hint">
              Click tiles to paint or erase road. Assembly exit and Launch Pad
              tiles stay fixed. Path must connect both ends. Use{' '}
              <strong>Straight road</strong> for a short corridor.
            </p>
            <div className="redesign-haul__tools">
              <button type="button" className="btn btn--ghost" onClick={paintStraight}>
                Straight road
              </button>
              <button type="button" className="btn btn--ghost" onClick={resetWindingRoad}>
                Reset winding road
              </button>
            </div>
            {roadError && (
              <p className="redesign-error" role="alert">
                {roadError}
              </p>
            )}
            <div
              className="redesign-haul__map"
              style={{ aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}` }}
            >
              <div
                className="redesign-haul__grid"
                style={{
                  gridTemplateColumns: `repeat(${ROAD_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${ROAD_ROWS}, 1fr)`,
                }}
              >
                {Array.from({ length: ROAD_ROWS }, (_, row) =>
                  Array.from({ length: ROAD_COLS }, (_, col) => {
                    const key = cellKey(col, row)
                    const on = roadTiles.has(key)
                    const isStart = key === endpoints.start
                    const isEnd = key === endpoints.end
                    return (
                      <button
                        key={key}
                        type="button"
                        className={[
                          'redesign-haul__cell',
                          on ? 'redesign-haul__cell--road' : '',
                          isStart ? 'redesign-haul__cell--start' : '',
                          isEnd ? 'redesign-haul__cell--end' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => toggleTile(col, row)}
                        aria-label={
                          isStart
                            ? 'Assembly (fixed)'
                            : isEnd
                              ? 'Launch pad (fixed)'
                              : on
                                ? `Road tile ${col},${row} — click to remove`
                                : `Grass tile ${col},${row} — click to add road`
                        }
                        disabled={isStart || isEnd}
                      />
                    )
                  }),
                )}
              </div>
              <span className="redesign-haul__label redesign-haul__label--asm">
                Assembly
              </span>
              <span className="redesign-haul__label redesign-haul__label--pad">
                Launch Pad
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function MachineSlot({
  machine,
  slotIndex,
  onDrop,
  onParkChange,
}: {
  machine: ProcessMachine
  slotIndex: number
  onDrop: (machineId: string) => void
  onParkChange: (value: number) => void
}) {
  return (
    <div
      className="redesign-slot"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const machineId =
          e.dataTransfer.getData('text/plain') ||
          e.dataTransfer.getData('application/x-machine-id')
        if (machineId) onDrop(machineId)
      }}
    >
      <div
        className="redesign-machine"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', machine.id)
          e.dataTransfer.setData('application/x-machine-id', machine.id)
        }}
        style={{
          // Match play scene: parkOffset is rem above the belt.
          transform: `translateY(calc(-1 * ${machine.parkOffset}rem))`,
        }}
      >
        <span className="redesign-machine__badge">{machine.sequence}</span>
        <span className="redesign-machine__name">{machine.name}</span>
        <span className="redesign-machine__slot">Slot {slotIndex + 1}</span>
        <label className="redesign-machine__park">
          <span>Distance from line</span>
          <input
            type="range"
            min={0.4}
            max={3.2}
            step={0.05}
            value={machine.parkOffset}
            onChange={(e) => onParkChange(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <span className="redesign-machine__park-val">
            {machine.parkOffset.toFixed(2)} rem
          </span>
        </label>
      </div>
      <div className="redesign-slot__stop" aria-hidden="true" />
    </div>
  )
}
