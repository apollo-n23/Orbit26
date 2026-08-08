import { useEffect, useMemo, useState } from 'react'
import type { ProcessMachine, ProcessVersion } from '../types/process'
import {
  applyAutoMoveBooster,
  applyHaulPath,
  applyKeyLubrication,
  applyLaunchPrepTechs,
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
  resolveKeyLubrication,
  resolveLaunchPrepTechs,
  resolveLaunchSeqRealignIds,
  resolveLaunchSeqRemovedIds,
  toggleLaunchPrepTech,
} from '../lib/processEdit'
import {
  AUTO_TRANSFER_COST,
  buildCostBreakdown,
  GO_REALIGN_COST,
  KEY_LUBRICATION_COST,
  LAUNCH_PREP_TECH_COST,
  MACHINE_MOVE_COST,
  movedMachineIds,
  RANGE_REMOVAL_COST,
  REDESIGN_BUDGET,
  remainingBudget as computeRemainingBudget,
} from '../lib/redesignCost'
import { Booster } from './Booster'
import { IntegratePayloadScene } from './IntegratePayloadScene'
import { LaunchSequenceScene } from './LaunchSequenceScene'
import type { LaunchPrepTech, RunState } from '../types/process'
import {
  INITIAL_RUN_STATE,
  LAUNCH_SEQ_GO_STATIONS,
  LAUNCH_SEQ_RANGE_STATION_ID,
} from '../types/process'
import { finishLaunchSequenceAction, markOnPad } from '../lib/simulation'
import {
  ROAD_COLS,
  ROAD_ROWS,
  ROAD_COST_PER_TILE,
  TREE_CLUSTER_CELLS,
  cellKey,
  pathFromRoadTiles,
  rasterizePath,
  requiredEndpointCells,
  roadCostFromTiles,
  type CellKey,
} from '../lib/roadGrid'
import { HAUL_PATH, SCENE_HEIGHT, SCENE_WIDTH } from '../lib/pathGeometry'
import { downloadTextFile } from '../lib/fileDownload'

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
  /** Shown when an action is blocked because it would exceed the budget. */
  const [budgetError, setBudgetError] = useState<string | null>(null)
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
  // The road as it stood when this redesign session started — already
  // built, so it's free. Frozen at mount; never mutated afterward.
  const [baselineRoadTiles] = useState<Set<CellKey>>(() =>
    rasterizePath(haulDefaultPath),
  )

  const machinesSorted = useMemo(() => {
    const mfg = getManufactureStep(draft)
    const list = mfg?.machines ?? []
    return [...list].sort((a, b) => a.linePosition - b.linePosition)
  }, [draft])

  const autoMoveBooster = resolveAutoMoveBooster(draft)
  const launchPrepTechs = resolveLaunchPrepTechs(draft)
  const launchSeqRealignIds = resolveLaunchSeqRealignIds(draft)
  const launchSeqRemovedIds = resolveLaunchSeqRemovedIds(draft)
  const rangeRemoved = launchSeqRemovedIds.includes(LAUNCH_SEQ_RANGE_STATION_ID)
  const keyLubrication = resolveKeyLubrication(draft)
  const endpoints = requiredEndpointCells()
  const roadCost = useMemo(
    () => roadCostFromTiles(roadTiles, baselineRoadTiles),
    [roadTiles, baselineRoadTiles],
  )
  const treeCells = useMemo(() => new Set<CellKey>(TREE_CLUSTER_CELLS), [])

  // Launch-sequence tab: live preview of the mission-control scene, driven
  // by a local, throwaway run — never touches real round/session state.
  const launchSeqStepIndex = useMemo(
    () => draft.steps.findIndex((s) => s.kind === 'launch-sequence'),
    [draft],
  )
  const [previewRun, setPreviewRun] = useState<RunState>(() => ({
    ...INITIAL_RUN_STATE,
    status: 'running',
    currentStepIndex: launchSeqStepIndex,
  }))
  const [previewNonce, setPreviewNonce] = useState(0)

  // Restart the preview whenever the redesign changes underneath it, so a
  // mid-sequence realign/removal can never leave it pointing at a station
  // that no longer exists at that index.
  useEffect(() => {
    setPreviewRun({
      ...INITIAL_RUN_STATE,
      status: 'running',
      currentStepIndex: launchSeqStepIndex,
    })
    setPreviewNonce((n) => n + 1)
    // Only the ids' content matters, not array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchSeqRealignIds.join(','), launchSeqRemovedIds.join(','), launchSeqStepIndex])

  function handlePreviewActionComplete() {
    setPreviewRun((prev) => finishLaunchSequenceAction(draft, prev))
  }

  // Haul tab: live preview of the pad-approach scene for the currently
  // painted road — same self-contained, throwaway-run pattern as above.
  const haulStepIndex = useMemo(
    () => draft.steps.findIndex((s) => s.kind === 'haul'),
    [draft],
  )
  const haulPreviewPath = useMemo(() => {
    const path = pathFromRoadTiles(roadTiles)
    return path && path.length >= 2 ? path : HAUL_PATH
  }, [roadTiles])
  const haulPreviewPathKey = useMemo(
    () => haulPreviewPath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|'),
    [haulPreviewPath],
  )
  const [haulPreviewRun, setHaulPreviewRun] = useState<RunState>(() => ({
    ...INITIAL_RUN_STATE,
    status: 'running',
    currentStepIndex: haulStepIndex,
  }))

  // Restart the preview booster whenever the painted road's shape actually
  // changes, so it never sits mid-transit on a path that no longer exists.
  useEffect(() => {
    setHaulPreviewRun({
      ...INITIAL_RUN_STATE,
      status: 'running',
      currentStepIndex: haulStepIndex,
    })
    // Only the path's shape matters, not array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haulPreviewPathKey, haulStepIndex])

  function handleHaulPreviewReachedPad() {
    setHaulPreviewRun((prev) => markOnPad(prev))
  }
  // No-op, same reasoning as Gemba: completeHaulStep would advance to the
  // next process step, which this preview doesn't render. The scene's own
  // "seated" visual already shows the booster arriving on the pad.
  function handleHaulPreviewMountToPad() {}

  // Cost of improvement (settled): everything except road tiles is a
  // one-way ratchet — once ever selected, it stays counted this session
  // even if later toggled off. Only removing road tiles reduces the total.
  const [everMovedMachineIds, setEverMovedMachineIds] = useState<Set<string>>(
    () => new Set(),
  )
  useEffect(() => {
    const movedNow = movedMachineIds(machinesSorted)
    if (movedNow.length === 0) return
    setEverMovedMachineIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of movedNow) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [machinesSorted])

  const [everAutoTransferOn, setEverAutoTransferOn] = useState(false)
  useEffect(() => {
    if (autoMoveBooster) setEverAutoTransferOn(true)
  }, [autoMoveBooster])

  const [everSelectedTechIds, setEverSelectedTechIds] = useState<
    Set<LaunchPrepTech>
  >(() => new Set())
  useEffect(() => {
    if (launchPrepTechs.length === 0) return
    setEverSelectedTechIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of launchPrepTechs) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
    // launchPrepTechs is a fresh array each render — only its content matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchPrepTechs.join(',')])

  const [everRealignedGoIds, setEverRealignedGoIds] = useState<Set<string>>(
    () => new Set(),
  )
  useEffect(() => {
    if (launchSeqRealignIds.length === 0) return
    setEverRealignedGoIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const id of launchSeqRealignIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
    // launchSeqRealignIds is a fresh array each render — only its content matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchSeqRealignIds.join(',')])

  const [everRangeRemoved, setEverRangeRemoved] = useState(false)
  useEffect(() => {
    if (rangeRemoved) setEverRangeRemoved(true)
  }, [rangeRemoved])

  const [everKeyLubricationOn, setEverKeyLubricationOn] = useState(false)
  useEffect(() => {
    if (keyLubrication) setEverKeyLubricationOn(true)
  }, [keyLubrication])

  const costBreakdown = useMemo(
    () =>
      buildCostBreakdown({
        machineMoveCost: everMovedMachineIds.size * MACHINE_MOVE_COST,
        autoTransferCost: everAutoTransferOn ? AUTO_TRANSFER_COST : 0,
        roadCost,
        launchPrepTechCost: [...everSelectedTechIds].reduce(
          (sum, id) => sum + LAUNCH_PREP_TECH_COST[id],
          0,
        ),
        goRealignCost: everRealignedGoIds.size * GO_REALIGN_COST,
        rangeRemovalCost: everRangeRemoved ? RANGE_REMOVAL_COST : 0,
        keyLubricationCost: everKeyLubricationOn ? KEY_LUBRICATION_COST : 0,
      }),
    [
      everMovedMachineIds,
      everAutoTransferOn,
      roadCost,
      everSelectedTechIds,
      everRealignedGoIds,
      everRangeRemoved,
      everKeyLubricationOn,
    ],
  )

  /** Budget left before hitting REDESIGN_BUDGET — only new charges are gated. */
  const remainingBudget = computeRemainingBudget(costBreakdown)
  const budgetExhausted = remainingBudget <= 0

  function blockOverBudget(cost: number, description: string): boolean {
    if (cost > remainingBudget) {
      setBudgetError(
        `Not enough budget to ${description} — needs ${cost} pts, ` +
          `${Math.max(remainingBudget, 0)} pts left of ${REDESIGN_BUDGET}.`,
      )
      return true
    }
    setBudgetError(null)
    return false
  }

  function handleDropOnSlot(targetSlotIndex: number, machineId: string) {
    if (!machineId) return
    const ordered = machinesSorted.map((m) => m.id)
    if (!ordered.includes(machineId)) return
    // Rebuild left→right order: remove, then insert at the drop slot.
    const next = ordered.filter((id) => id !== machineId)
    const insertAt = Math.max(0, Math.min(targetSlotIndex, next.length))
    next.splice(insertAt, 0, machineId)
    const candidate = applyMachineLineOrder(draft, next)
    const candidateMachines = getManufactureStep(candidate)?.machines ?? []
    const newlyMoved = movedMachineIds(candidateMachines).filter(
      (id) => !everMovedMachineIds.has(id),
    )
    const cost = newlyMoved.length * MACHINE_MOVE_COST
    if (blockOverBudget(cost, 'move this machine')) return
    setDraft(candidate)
  }

  function handleParkChange(machineId: string, value: number) {
    setDraft((p) => applyMachineParkOffset(p, machineId, value))
  }

  function handleToggleAutoMove() {
    const enabling = !resolveAutoMoveBooster(draft)
    if (enabling && !everAutoTransferOn) {
      if (blockOverBudget(AUTO_TRANSFER_COST, 'enable auto-transfer')) return
    } else {
      setBudgetError(null)
    }
    setDraft((p) => applyAutoMoveBooster(p, enabling))
  }

  function handleToggleLaunchPrepTech(tech: LaunchPrepTech) {
    const enabling = !launchPrepTechs.includes(tech)
    if (enabling && !everSelectedTechIds.has(tech)) {
      const name = LAUNCH_PREP_TECH_OPTIONS.find((o) => o.id === tech)?.name ?? tech
      if (blockOverBudget(LAUNCH_PREP_TECH_COST[tech], `invest in ${name}`)) return
    } else {
      setBudgetError(null)
    }
    setDraft((p) => toggleLaunchPrepTech(p, tech, enabling))
  }

  function handleToggleLaunchSeqRealign(stationId: string) {
    const realigned = resolveLaunchSeqRealignIds(draft).includes(stationId)
    if (!realigned && !everRealignedGoIds.has(stationId)) {
      if (blockOverBudget(GO_REALIGN_COST, 'realign this station')) return
    } else {
      setBudgetError(null)
    }
    setDraft((p) => applyLaunchSeqRealign(p, stationId, !realigned))
  }

  function handleDeleteRangeFromSequence() {
    if (!everRangeRemoved) {
      if (blockOverBudget(RANGE_REMOVAL_COST, 'remove Range Safety')) return
    } else {
      setBudgetError(null)
    }
    setDraft((p) => applyLaunchSeqRemove(p, LAUNCH_SEQ_RANGE_STATION_ID, true))
    setLaunchSeqInfoId(null)
  }

  function handleRestoreRangeToSequence() {
    setDraft((p) => applyLaunchSeqRemove(p, LAUNCH_SEQ_RANGE_STATION_ID, false))
  }

  function handleToggleKeyLubrication() {
    const enabling = !resolveKeyLubrication(draft)
    if (enabling && !everKeyLubricationOn) {
      if (blockOverBudget(KEY_LUBRICATION_COST, 'lubricate the launch key')) return
    } else {
      setBudgetError(null)
    }
    setDraft((p) => applyKeyLubrication(p, enabling))
  }

  function toggleLaunchSeqInfo(stationId: string) {
    setLaunchSeqInfoId((prev) => (prev === stationId ? null : stationId))
  }

  function toggleTile(col: number, row: number) {
    const key = cellKey(col, row)
    // Endpoints stay on (free baseline — not billable, not removable).
    if (key === endpoints.start || key === endpoints.end) return
    // Tree cluster is a fixed decorative obstacle — never paintable as road.
    if (treeCells.has(key)) return
    // Painting a brand-new (non-baseline) tile costs points — gate on budget.
    // Removing/selling a tile only ever helps the budget, so it's never blocked.
    const addingNewTile = !roadTiles.has(key) && !baselineRoadTiles.has(key)
    if (addingNewTile) {
      if (blockOverBudget(ROAD_COST_PER_TILE, 'add this road tile')) return
    } else {
      setBudgetError(null)
    }
    setRoadTiles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setRoadError(null)
  }

  /** Plain-text snapshot of every choice made so far, for "Save my current choices". */
  function buildChoicesSummary(): string {
    const movedNow = new Set(movedMachineIds(machinesSorted))
    const lineOrder = machinesSorted.map((m) => m.name).join(', ')
    const movedNames = machinesSorted
      .filter((m) => movedNow.has(m.id))
      .map((m) => m.name)
    const techNames = launchPrepTechs.map(
      (id) => LAUNCH_PREP_TECH_OPTIONS.find((o) => o.id === id)?.name ?? id,
    )
    const realignedNames = launchSeqRealignIds.map(
      (id) => LAUNCH_SEQ_GO_STATIONS.find((s) => s.id === id)?.name ?? id,
    )
    const savedAt = new Date().toLocaleString()

    const lines = [
      'Orb-it Redesign Workshop — saved choices',
      `${roundLabel}`,
      `Saved: ${savedAt}`,
      '',
      'MANUFACTURE',
      `Line order (left to right): ${lineOrder || 'unchanged'}`,
      `Machines moved from factory position: ${movedNames.length > 0 ? movedNames.join(', ') : 'none'}`,
      `Auto-transfer upgrade: ${autoMoveBooster ? 'On' : 'Off'}`,
      '',
      'HAUL ROAD',
      `Net road cost: ${roadCost} pts (tiles painted beyond the original road, minus any baseline tiles sold)`,
      '',
      'LAUNCH PREP TECHNOLOGY',
      `Selected: ${techNames.length > 0 ? techNames.join(', ') : 'none'}`,
      '',
      'LAUNCH SEQUENCE',
      `Realigned GO calls: ${realignedNames.length > 0 ? realignedNames.join(', ') : 'none'}`,
      `Range Safety removed from poll: ${rangeRemoved ? 'Yes' : 'No'}`,
      `Key lubrication: ${keyLubrication ? 'Yes' : 'No'}`,
      '',
      'COST OF IMPROVEMENT',
      `Manufacture: ${costBreakdown.machineMoveCost + costBreakdown.autoTransferCost} pts`,
      `Haul road: ${costBreakdown.roadCost} pts`,
      `Launch prep technology: ${costBreakdown.launchPrepTechCost} pts`,
      `Launch sequence: ${costBreakdown.goRealignCost + costBreakdown.rangeRemovalCost + costBreakdown.keyLubricationCost} pts`,
      `Total: ${costBreakdown.total} pts`,
      '',
      'BUDGET',
      `Redesign budget: ${REDESIGN_BUDGET} pts`,
      `Remaining: ${remainingBudget} pts`,
    ]
    return lines.join('\r\n')
  }

  function handleSaveChoices() {
    downloadTextFile('orbit26-redesign-choices.txt', buildChoicesSummary())
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
    const selectedTechs = resolveLaunchPrepTechs(draft)
    const realignIds = resolveLaunchSeqRealignIds(draft)
    const removedIds = resolveLaunchSeqRemovedIds(draft)
    const keyLubricationSelected = resolveKeyLubrication(draft)
    // Always start from a fresh clone of the manufacture draft, then stamp the road.
    let withRoad = applyHaulPath(structuredClone(draft), path)
    // Re-stamp launch-prep techs after haul apply (defensive: same field on version + step).
    withRoad = applyLaunchPrepTechs(withRoad, selectedTechs)
    // Re-stamp launch-sequence redesign (realign + optional Range removal).
    withRoad = applyLaunchSeqRedesign(withRoad, realignIds, removedIds)
    // Re-stamp key lubrication (defensive: same field on version + step).
    withRoad = applyKeyLubrication(withRoad, keyLubricationSelected)
    const stored = withRoad.haulPathOverride ?? getHaulStep(withRoad)?.haulPath
    if (!stored || stored.length < 2) {
      setShowConfirmDialog(false)
      setRoadError(
        'Could not save road layout. Paint a continuous path from Assembly to Launch Pad, then confirm again.',
      )
      setTab('haul')
      return
    }
    // Fix the total cost of improvement for this round at the moment of confirm.
    withRoad = { ...withRoad, costBreakdown }
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
        </div>
        <div className="sim-header__controls">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleSaveChoices}
          >
            Save my current choices
          </button>
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
        <div
          className={[
            'redesign-cost-banner',
            budgetExhausted ? 'redesign-cost-banner--exhausted' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
        >
          <div className="redesign-cost-banner__total">
            <span className="redesign-cost-banner__label">
              Total cost of improvement
            </span>
            <span className="redesign-cost-banner__value">
              {costBreakdown.total}
              <span className="redesign-cost-banner__unit">
                {' '}
                / {REDESIGN_BUDGET} pts
              </span>
            </span>
          </div>
          <div className="redesign-cost-banner__remaining">
            <span className="redesign-cost-banner__label">
              Budget remaining
            </span>
            <span className="redesign-cost-banner__value redesign-cost-banner__value--remaining">
              {Math.max(remainingBudget, 0)}
              <span className="redesign-cost-banner__unit"> pts</span>
            </span>
          </div>
          <ul className="redesign-cost-banner__breakdown">
            <li>
              Manufacture{' '}
              <strong>
                {costBreakdown.machineMoveCost + costBreakdown.autoTransferCost}
              </strong>
            </li>
            <li>
              Haul road <strong>{costBreakdown.roadCost}</strong>
            </li>
            <li>
              Launch prep <strong>{costBreakdown.launchPrepTechCost}</strong>
            </li>
            <li>
              Launch sequence{' '}
              <strong>
                {costBreakdown.goRealignCost +
                  costBreakdown.rangeRemovalCost +
                  costBreakdown.keyLubricationCost}
              </strong>
            </li>
          </ul>
          {budgetExhausted && (
            <p className="redesign-cost-banner__exhausted-note" role="alert">
              Budget exhausted — no further cost-increasing improvements can
              be selected. Sell road tiles on the Haul road tab to free up
              room.
            </p>
          )}
          {budgetError && (
            <p className="redesign-cost-banner__exhausted-note" role="alert">
              {budgetError}
            </p>
          )}
          <p className="redesign-cost-banner__hint">
            Starts at zero — the existing road is already built and free.
            Only the Haul road tab can bring the total back down: selling
            existing road credits points back, and erasing a tile you added
            just cancels its own cost. Every other investment is permanent
            for this round once selected.
          </p>
        </div>

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
            <p className="redesign-hint redesign-hint--cost">
              Moving a machine from its factory slot costs{' '}
              <strong>{MACHINE_MOVE_COST} pts</strong> each (
              {everMovedMachineIds.size} moved so far). The auto-transfer
              upgrade below is a bigger one-time investment at{' '}
              <strong>{AUTO_TRANSFER_COST} pts</strong>.
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
                        ? `After each machine finishes, the booster moves to the next station automatically during launches. (${AUTO_TRANSFER_COST} pts, already invested.)`
                        : `Upgrade the booster so it auto-moves to the next station when a machine completes its task. Costs ${AUTO_TRANSFER_COST} pts, one time.`}
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
                        disabled={
                          !autoMoveBooster &&
                          !everAutoTransferOn &&
                          AUTO_TRANSFER_COST > remainingBudget
                        }
                      >
                        {autoMoveBooster
                          ? 'Disable auto-transfer'
                          : `Enable auto-transfer${
                              !everAutoTransferOn &&
                              AUTO_TRANSFER_COST > remainingBudget
                                ? ' (over budget)'
                                : ''
                            }`}
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
              Invest in <strong>as many</strong> pad technologies as your
              budget allows — they're not mutually exclusive. Your choices
              apply to all three launches. Select again to turn one off —
              note that doing so does not refund the cost of one you tried
              earlier this session.
            </p>
            <div className="redesign-tech-grid" aria-label="Launch prep technologies">
              {LAUNCH_PREP_TECH_OPTIONS.map((opt) => {
                const selected = launchPrepTechs.includes(opt.id)
                const everTried = everSelectedTechIds.has(opt.id)
                const overBudget =
                  !selected &&
                  !everTried &&
                  LAUNCH_PREP_TECH_COST[opt.id] > remainingBudget
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    className={[
                      'redesign-tech-card',
                      selected ? 'redesign-tech-card--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleToggleLaunchPrepTech(opt.id)}
                    disabled={overBudget}
                  >
                    <span className="redesign-tech-card__name">{opt.name}</span>
                    <span className="redesign-tech-card__summary">{opt.summary}</span>
                    <span className="redesign-tech-card__cost">
                      {LAUNCH_PREP_TECH_COST[opt.id]} pts
                      {everTried && !selected ? ' · already spent' : ''}
                      {overBudget ? ' · over budget' : ''}
                    </span>
                    <span className="redesign-tech-card__status">
                      {selected ? 'Selected' : 'Select investment'}
                    </span>
                  </button>
                )
              })}
            </div>
            {launchPrepTechs.length > 0 && (
              <p className="redesign-hint redesign-hint--ok">
                Active investments:{' '}
                <strong>
                  {launchPrepTechs
                    .map(
                      (id) =>
                        LAUNCH_PREP_TECH_OPTIONS.find((o) => o.id === id)?.name ??
                        id,
                    )
                    .join(', ')}
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
              station (<strong>{GO_REALIGN_COST} pts</strong> each). Open the
              info panel for operational criticality. Range Safety can be
              removed from the sequence entirely ({RANGE_REMOVAL_COST} pts).
            </p>

            <button
              type="button"
              className={[
                'redesign-tech-card',
                'redesign-key-lube',
                keyLubrication ? 'redesign-tech-card--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={handleToggleKeyLubrication}
              aria-pressed={keyLubrication}
              disabled={
                !keyLubrication &&
                !everKeyLubricationOn &&
                KEY_LUBRICATION_COST > remainingBudget
              }
            >
              <span className="redesign-tech-card__name">Key lubrication</span>
              <span className="redesign-tech-card__summary">
                A cheap, simple fix for the final step: lubricate the launch
                key mechanism so the hold-to-turn arming action is almost
                instantaneous instead of a long deliberate hold.
              </span>
              <span className="redesign-tech-card__cost">
                {KEY_LUBRICATION_COST} pts
                {!keyLubrication && everKeyLubricationOn ? ' · already spent' : ''}
                {!keyLubrication &&
                !everKeyLubricationOn &&
                KEY_LUBRICATION_COST > remainingBudget
                  ? ' · over budget'
                  : ''}
              </span>
              <span className="redesign-tech-card__status">
                {keyLubrication ? 'Enabled' : 'Enable'}
              </span>
            </button>

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
                            disabled={
                              !realigned &&
                              !everRealignedGoIds.has(station.id) &&
                              GO_REALIGN_COST > remainingBudget
                            }
                          >
                            {realigned
                              ? 'Undo realign'
                              : !everRealignedGoIds.has(station.id) &&
                                  GO_REALIGN_COST > remainingBudget
                                ? 'Realign (over budget)'
                                : `Realign (${GO_REALIGN_COST} pts)`}
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
                              disabled={
                                !everRangeRemoved &&
                                RANGE_REMOVAL_COST > remainingBudget
                              }
                            >
                              {!everRangeRemoved &&
                              RANGE_REMOVAL_COST > remainingBudget
                                ? 'Delete from sequence (over budget)'
                                : `Delete from sequence (${RANGE_REMOVAL_COST} pts)`}
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

            <div className="redesign-seq-preview">
              <p className="redesign-hint">
                <strong>Preview:</strong> this is how the launch sequence will
                look in play, including your realigns and removals. Try it —
                nothing here is scored or saved.
              </p>
              <LaunchSequenceScene
                key={`redesign-seq-preview-${previewNonce}`}
                run={previewRun}
                process={draft}
                onActionComplete={handlePreviewActionComplete}
              />
            </div>
          </div>
        )}

        {tab === 'haul' && (
          <div className="redesign-haul">
            <p className="redesign-hint">
              Click tiles to paint or erase road. Assembly exit and Launch Pad
              tiles stay fixed and free. The existing road is already built —
              it's free and doesn't count toward your starting cost. Painting
              a <strong>new</strong> tile beyond it costs{' '}
              {ROAD_COST_PER_TILE} pts; selling an existing tile credits{' '}
              {ROAD_COST_PER_TILE} pts back. This is the <strong>only</strong>{' '}
              cost you can bring back down. Path must connect both ends.
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
                    const isTree = treeCells.has(key)
                    const on = !isTree && roadTiles.has(key)
                    const isStart = key === endpoints.start
                    const isEnd = key === endpoints.end
                    const isBaseline = !isStart && !isEnd && baselineRoadTiles.has(key)
                    const overBudget =
                      !on &&
                      !isBaseline &&
                      ROAD_COST_PER_TILE > remainingBudget
                    return (
                      <button
                        key={key}
                        type="button"
                        className={[
                          'redesign-haul__cell',
                          on ? 'redesign-haul__cell--road' : '',
                          on && !isBaseline ? 'redesign-haul__cell--road-new' : '',
                          isStart ? 'redesign-haul__cell--start' : '',
                          isEnd ? 'redesign-haul__cell--end' : '',
                          isTree ? 'redesign-haul__cell--tree' : '',
                          overBudget ? 'redesign-haul__cell--over-budget' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => toggleTile(col, row)}
                        aria-label={
                          isStart
                            ? 'Assembly (fixed)'
                            : isEnd
                              ? 'Launch pad (fixed)'
                              : isTree
                                ? 'Tree cluster (fixed) — road cannot be built here'
                                : on
                                  ? isBaseline
                                    ? `Existing road tile ${col},${row} — click to sell (+${ROAD_COST_PER_TILE} pts credit)`
                                    : `New road tile ${col},${row} — click to remove (−${ROAD_COST_PER_TILE} pts)`
                                  : isBaseline
                                    ? `Sold road tile ${col},${row} — click to rebuild (free, restores existing road)`
                                    : overBudget
                                      ? `Grass tile ${col},${row} — over budget, cannot add road`
                                      : `Grass tile ${col},${row} — click to add road (+${ROAD_COST_PER_TILE} pts)`
                        }
                        disabled={isStart || isEnd || isTree || overBudget}
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

            <div className="redesign-haul-preview">
              <p className="redesign-hint">
                <strong>Preview:</strong> this is the pad-approach view your
                painted road produces. Try it — nothing here is scored or
                saved.
              </p>
              <IntegratePayloadScene
                key={`redesign-haul-preview-${haulPreviewPathKey}`}
                run={haulPreviewRun}
                haulPath={haulPreviewPath}
                onReachedPad={handleHaulPreviewReachedPad}
                onMountToPad={handleHaulPreviewMountToPad}
              />
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
