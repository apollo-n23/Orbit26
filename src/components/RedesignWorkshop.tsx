import { useMemo, useState } from 'react'
import type { ProcessMachine, ProcessVersion } from '../types/process'
import {
  applyAutoMoveBooster,
  applyHaulPath,
  applyLaunchPrepTech,
  applyLaunchSeqRealign,
  applyLaunchSeqRedesign,
  applyLaunchSeqRemove,
  applyMachineLineOrder,
  applyMachineParkOffset,
  getHaulStep,
  getManufactureStep,
  LAUNCH_PREP_TECH_OPTIONS,
  LAUNCH_SEQ_STATION_CRITICALITY,
  resolveAutoMoveBooster,
  resolveLaunchPrepTech,
  resolveLaunchSeqRealignIds,
  resolveLaunchSeqRemovedIds,
} from '../lib/processEdit'
import { Booster } from './Booster'
import type { LaunchPrepTech } from '../types/process'
import {
  LAUNCH_SEQ_GO_STATIONS,
  LAUNCH_SEQ_RANGE_STATION_ID,
} from '../types/process'
import {
  ROAD_COLS,
  ROAD_ROWS,
  ROAD_COST_PER_TILE,
  cellKey,
  pathFromRoadTiles,
  rasterizePath,
  requiredEndpointCells,
  roadCostFromTiles,
  type CellKey,
} from '../lib/roadGrid'
import { HAUL_PATH, SCENE_HEIGHT, SCENE_WIDTH } from '../lib/pathGeometry'

type RedesignTab = 'manufacture' | 'haul' | 'launch-prep' | 'launch-sequence'

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
  /** Booster upgrade panel: open once on hover/focus, then stays until dismissed. */
  const [upgradePanelOpen, setUpgradePanelOpen] = useState(false)
  /** Confirm lock-in dialog before starting launches. */
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  /** Launch-sequence tab: which station's criticality panel is expanded. */
  const [launchSeqInfoId, setLaunchSeqInfoId] = useState<string | null>(null)

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
  const launchPrepTech = resolveLaunchPrepTech(draft)
  const launchSeqRealignIds = resolveLaunchSeqRealignIds(draft)
  const launchSeqRemovedIds = resolveLaunchSeqRemovedIds(draft)
  const rangeRemoved = launchSeqRemovedIds.includes(LAUNCH_SEQ_RANGE_STATION_ID)
  const endpoints = requiredEndpointCells()
  const roadCost = useMemo(() => roadCostFromTiles(roadTiles), [roadTiles])

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

  function handleSelectLaunchPrepTech(tech: LaunchPrepTech) {
    setDraft((p) => {
      const current = resolveLaunchPrepTech(p)
      // Toggle off if re-selecting the same investment.
      return applyLaunchPrepTech(p, current === tech ? null : tech)
    })
  }

  function handleToggleLaunchSeqRealign(stationId: string) {
    setDraft((p) => {
      const realigned = resolveLaunchSeqRealignIds(p).includes(stationId)
      return applyLaunchSeqRealign(p, stationId, !realigned)
    })
  }

  function handleDeleteRangeFromSequence() {
    setDraft((p) => applyLaunchSeqRemove(p, LAUNCH_SEQ_RANGE_STATION_ID, true))
    setLaunchSeqInfoId(null)
  }

  function handleRestoreRangeToSequence() {
    setDraft((p) => applyLaunchSeqRemove(p, LAUNCH_SEQ_RANGE_STATION_ID, false))
  }

  function toggleLaunchSeqInfo(stationId: string) {
    setLaunchSeqInfoId((prev) => (prev === stationId ? null : stationId))
  }

  function toggleTile(col: number, row: number) {
    const key = cellKey(col, row)
    // Endpoints stay on (free baseline — not billable, not removable).
    if (key === endpoints.start || key === endpoints.end) return
    setRoadTiles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setRoadError(null)
  }

  function validateAndLockIn() {
    const path = pathFromRoadTiles(roadTiles)
    if (!path || path.length < 2) {
      setShowConfirmDialog(false)
      setRoadError(
        'Road must connect Assembly to the Launch Pad. Paint a continuous path between both ends.',
      )
      setTab('haul')
      return
    }
    // Snapshot redesign choices before haul stamp so play cannot lose investments.
    const selectedTech = resolveLaunchPrepTech(draft)
    const realignIds = resolveLaunchSeqRealignIds(draft)
    const removedIds = resolveLaunchSeqRemovedIds(draft)
    // Always start from a fresh clone of the manufacture draft, then stamp the road + cost.
    const cost = roadCostFromTiles(roadTiles)
    let withRoad = applyHaulPath(structuredClone(draft), path, cost)
    // Re-stamp launch-prep tech after haul apply (defensive: same field on version + step).
    withRoad = applyLaunchPrepTech(withRoad, selectedTech)
    // Re-stamp launch-sequence redesign (realign + optional Range removal).
    withRoad = applyLaunchSeqRedesign(withRoad, realignIds, removedIds)
    const stored = withRoad.haulPathOverride ?? getHaulStep(withRoad)?.haulPath
    if (!stored || stored.length < 2) {
      setShowConfirmDialog(false)
      setRoadError(
        'Could not save road layout. Paint a continuous path from Assembly to Launch Pad, then confirm again.',
      )
      setTab('haul')
      return
    }
    setShowConfirmDialog(false)
    onConfirm(withRoad)
  }

  function handleRequestConfirm() {
    setShowConfirmDialog(true)
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
          <p className="redesign-road-cost" aria-live="polite">
            Road cost:{' '}
            <strong className="redesign-road-cost__value">{roadCost}</strong>
            <span className="redesign-road-cost__unit">
              {' '}
              pts ({ROAD_COST_PER_TILE} per tile; endpoints free)
            </span>
          </p>
        </div>
        <div className="sim-header__controls">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleRequestConfirm}
          >
            Confirm layout & start launches
          </button>
        </div>
      </header>

      <div className="view-panel__body redesign-body">
        <div className="redesign-warning" role="status">
          <strong>Before you lock in:</strong> work through every redesign tab
          (manufacture line, haul road, launch prep tech, launch sequence) and
          finish any upgrades you want. Once you confirm, this layout is fixed
          for all three launches this round.
        </div>

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
          <button
            type="button"
            className={
              tab === 'launch-prep'
                ? 'redesign-tabs__btn redesign-tabs__btn--active'
                : 'redesign-tabs__btn'
            }
            onClick={() => setTab('launch-prep')}
          >
            3 · Launch prep tech
          </button>
          <button
            type="button"
            className={
              tab === 'launch-sequence'
                ? 'redesign-tabs__btn redesign-tabs__btn--active'
                : 'redesign-tabs__btn'
            }
            onClick={() => setTab('launch-sequence')}
          >
            4 · Launch sequence
          </button>
        </nav>

        {tab === 'manufacture' && (
          <div className="redesign-mfg">
            <p className="redesign-hint">
              Drag stations left/right to set line order (physical layout). Use
              the distance slider to park each machine closer to or further from
              the belt. Hover or click the booster on the line to open the
              auto-transfer upgrade (panel stays open so you can click the
              button). Operate sequence numbers stay on each machine.
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
                  upgradePanelOpen || autoMoveBooster
                    ? 'redesign-booster-upgrade--open'
                    : '',
                  autoMoveBooster ? 'redesign-booster-upgrade--on' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setUpgradePanelOpen(true)}
                onFocusCapture={() => setUpgradePanelOpen(true)}
              >
                <div className="redesign-booster-upgrade__unit">
                  <button
                    type="button"
                    className="redesign-booster-upgrade__hit"
                    onClick={() => setUpgradePanelOpen(true)}
                    aria-expanded={upgradePanelOpen || autoMoveBooster}
                    aria-controls="booster-upgrade-panel"
                  >
                    <Booster
                      className="booster--redesign"
                      label="Booster — open transfer upgrade"
                    />
                  </button>
                  <div
                    id="booster-upgrade-panel"
                    className="redesign-booster-upgrade__panel"
                    role="region"
                    aria-label="Booster transfer upgrade"
                  >
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
                    <div className="redesign-booster-upgrade__actions">
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
                      {upgradePanelOpen && !autoMoveBooster && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setUpgradePanelOpen(false)}
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'launch-prep' && (
          <div className="redesign-prep">
            <p className="redesign-hint">
              Invest in <strong>one</strong> pad technology for this round. Your
              choice applies to all three launches. Select again to clear.
            </p>
            <div className="redesign-tech-grid" role="listbox" aria-label="Launch prep technologies">
              {LAUNCH_PREP_TECH_OPTIONS.map((opt) => {
                const selected = launchPrepTech === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      'redesign-tech-card',
                      selected ? 'redesign-tech-card--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleSelectLaunchPrepTech(opt.id)}
                  >
                    <span className="redesign-tech-card__name">{opt.name}</span>
                    <span className="redesign-tech-card__summary">{opt.summary}</span>
                    <span className="redesign-tech-card__status">
                      {selected ? 'Selected' : 'Select investment'}
                    </span>
                  </button>
                )
              })}
            </div>
            {launchPrepTech && (
              <p className="redesign-hint redesign-hint--ok">
                Active investment:{' '}
                <strong>
                  {
                    LAUNCH_PREP_TECH_OPTIONS.find((o) => o.id === launchPrepTech)
                      ?.name
                  }
                </strong>
              </p>
            )}
          </div>
        )}

        {tab === 'launch-sequence' && (
          <div className="redesign-seq">
            <p className="redesign-hint">
              Mission-control GO stations for the launch poll. Use{' '}
              <strong>Realign</strong> to cut as-is misalignment friction on a
              station. Open the info panel for operational criticality. Range
              Safety can be removed from the sequence entirely.
            </p>
            <ul className="redesign-seq__list" aria-label="GO stations">
              {LAUNCH_SEQ_GO_STATIONS.map((station) => {
                const removed = launchSeqRemovedIds.includes(station.id)
                const realigned = launchSeqRealignIds.includes(station.id)
                const infoOpen = launchSeqInfoId === station.id
                const isRange = station.id === LAUNCH_SEQ_RANGE_STATION_ID
                const criticality =
                  LAUNCH_SEQ_STATION_CRITICALITY[station.id] ??
                  'Station contributes to the mission-control GO poll.'

                return (
                  <li
                    key={station.id}
                    className={[
                      'redesign-seq__row',
                      realigned ? 'redesign-seq__row--realigned' : '',
                      removed ? 'redesign-seq__row--removed' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="redesign-seq__main">
                      <div className="redesign-seq__identity">
                        <span className="redesign-seq__callsign">
                          {station.callsign}
                        </span>
                        <span className="redesign-seq__name">{station.name}</span>
                        {removed && (
                          <span className="redesign-seq__badge redesign-seq__badge--removed">
                            Removed
                          </span>
                        )}
                        {!removed && realigned && (
                          <span className="redesign-seq__badge redesign-seq__badge--realigned">
                            Realigned
                          </span>
                        )}
                      </div>
                      <div className="redesign-seq__actions">
                        {!removed && (
                          <button
                            type="button"
                            className={
                              realigned
                                ? 'btn btn--ghost redesign-seq__realign redesign-seq__realign--on'
                                : 'btn btn--primary redesign-seq__realign'
                            }
                            onClick={() =>
                              handleToggleLaunchSeqRealign(station.id)
                            }
                            aria-pressed={realigned}
                          >
                            {realigned ? 'Undo realign' : 'Realign'}
                          </button>
                        )}
                        {removed && isRange && (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={handleRestoreRangeToSequence}
                          >
                            Restore to sequence
                          </button>
                        )}
                        <button
                          type="button"
                          className={[
                            'redesign-seq__info-btn',
                            infoOpen ? 'redesign-seq__info-btn--open' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => toggleLaunchSeqInfo(station.id)}
                          aria-expanded={infoOpen}
                          aria-controls={`launch-seq-info-${station.id}`}
                          aria-label={
                            infoOpen
                              ? `Hide criticality for ${station.name}`
                              : `Show criticality for ${station.name}`
                          }
                          title={`${station.name} criticality`}
                        >
                          <span className="redesign-seq__info-icon" aria-hidden="true">
                            i
                          </span>
                        </button>
                      </div>
                    </div>
                    {infoOpen && (
                      <div
                        id={`launch-seq-info-${station.id}`}
                        className="redesign-seq__info-panel"
                        role="region"
                        aria-label={`${station.name} criticality`}
                      >
                        <p className="redesign-seq__info-copy">{criticality}</p>
                        {isRange && !removed && (
                          <div className="redesign-seq__info-actions">
                            <button
                              type="button"
                              className="btn btn--ghost redesign-seq__delete"
                              onClick={handleDeleteRangeFromSequence}
                            >
                              Delete from sequence
                            </button>
                          </div>
                        )}
                        {isRange && removed && (
                          <p className="redesign-seq__info-note">
                            Range Safety will not appear in the GO poll for this
                            round&apos;s launches.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {(launchSeqRealignIds.length > 0 || rangeRemoved) && (
              <p className="redesign-hint redesign-hint--ok">
                {launchSeqRealignIds.length > 0 && (
                  <>
                    Realigned:{' '}
                    <strong>
                      {launchSeqRealignIds
                        .map(
                          (id) =>
                            LAUNCH_SEQ_GO_STATIONS.find((s) => s.id === id)
                              ?.callsign ?? id,
                        )
                        .join(', ')}
                    </strong>
                  </>
                )}
                {launchSeqRealignIds.length > 0 && rangeRemoved && ' · '}
                {rangeRemoved && (
                  <>
                    Removed: <strong>RANGE</strong>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {tab === 'haul' && (
          <div className="redesign-haul">
            <p className="redesign-hint">
              Click tiles to paint or erase road. Assembly exit and Launch Pad
              tiles stay fixed and free. Each other road tile costs{' '}
              {ROAD_COST_PER_TILE} pts. Path must connect both ends.
            </p>
            <p className="redesign-road-cost redesign-road-cost--haul" aria-live="polite">
              Road cost:{' '}
              <strong className="redesign-road-cost__value">{roadCost}</strong>
              <span className="redesign-road-cost__unit"> pts</span>
            </p>
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

      {showConfirmDialog && (
        <div
          className="redesign-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="redesign-confirm-title"
        >
          <div className="redesign-confirm__backdrop" onClick={() => setShowConfirmDialog(false)} />
          <div className="redesign-confirm__card">
            <h3 id="redesign-confirm-title" className="redesign-confirm__title">
              Lock in this layout?
            </h3>
            <p className="redesign-confirm__copy">
              Are you sure you have finished redesigning all process steps you care
              about? This layout (machines, road, pad tech, and launch-sequence GO
              changes) will be used for all three launches and cannot be changed
              until the round ends.
            </p>
            <div className="redesign-confirm__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowConfirmDialog(false)}
              >
                No — keep editing
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={validateAndLockIn}
              >
                Yes — lock in &amp; start launches
              </button>
            </div>
          </div>
        </div>
      )}
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
