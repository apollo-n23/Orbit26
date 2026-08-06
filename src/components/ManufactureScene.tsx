import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ProcessMachine, RunState } from '../types/process'
import {
  BOOSTER_TRAVEL_MS,
  MACHINE_APPROACH_MS,
  MACHINE_WORK_MS,
} from '../types/process'
import { Booster } from './Booster'

interface ManufactureSceneProps {
  machines: ProcessMachine[]
  run: RunState
  onMachineClick: (machineId: string) => void
  /** Shown when manufacture machines are done and another step follows. */
  showProceed?: boolean
  onProceed?: () => void
  /**
   * Round 2 redesign upgrade: after each machine finishes, move booster to the
   * next required station automatically (no drag).
   */
  autoMoveBooster?: boolean
}

type MachinePhase = 'idle' | 'approaching' | 'working' | 'retreating'
type DropFeedback = 'wrong' | 'miss' | null

/** Entrance of the belt (left of first stop), as % of production-line width. */
const ENTRANCE_LEFT_PCT = -6
/** How close (line %) a drop must be to snap onto a station stop. */
const SNAP_THRESHOLD_PCT = 9
/** Vertical target when a machine is on the line (rem). */
const LINE_APPROACH_Y_REM = 5.25
/** Fallback park distance if data omits parkOffset. */
const DEFAULT_PARK_OFFSET = 1.5

function MachineVisual({ kind }: { kind: ProcessMachine['kind'] }) {
  if (kind === 'welder') {
    return (
      <div className="machine-art machine-art--welder" aria-hidden="true">
        <div className="machine-art__body" />
        <div className="machine-art__torch">
          <span className="machine-art__spark" />
        </div>
      </div>
    )
  }

  if (kind === 'laser') {
    return (
      <div className="machine-art machine-art--laser" aria-hidden="true">
        <div className="machine-art__head" />
        <div className="machine-art__beam" />
      </div>
    )
  }

  return (
    <div className="machine-art machine-art--arm" aria-hidden="true">
      <div className="machine-art__base" />
      <div className="machine-art__joint">
        <div className="machine-art__forearm">
          <div className="machine-art__gripper" />
        </div>
      </div>
    </div>
  )
}

/** Center of a station slot as % of the belt width (stops live on the belt). */
function linePosPercent(linePosition: number, count: number): number {
  if (count <= 0) return 50
  return ((linePosition + 0.5) / count) * 100
}

/**
 * Carrier is positioned on `.production-line` while stops sit on
 * `.production-line__belt` (left/right 2%). Map belt-relative % into line %.
 */
function carrierLeftOnLine(linePosition: number, count: number): number {
  const BELT_INSET = 2
  const BELT_SPAN = 96
  return BELT_INSET + (linePosPercent(linePosition, count) / 100) * BELT_SPAN
}

function parkOffsetOf(machine: ProcessMachine): number {
  return machine.parkOffset ?? DEFAULT_PARK_OFFSET
}

export function ManufactureScene({
  machines,
  run,
  onMachineClick,
  showProceed = false,
  onProceed,
  autoMoveBooster = false,
}: ManufactureSceneProps) {
  const required = machines[run.nextMachineIndex]
  const stepDone = run.status === 'step_complete'
  const canInteract = run.status === 'running' && required != null

  const activeMachine = run.activeMachineId
    ? machines.find((m) => m.id === run.activeMachineId)
    : undefined

  const stationCount = Math.max(
    machines.length,
    ...machines.map((m) => m.linePosition + 1),
    1,
  )

  const stations = useMemo(
    () => [...machines].sort((a, b) => a.linePosition - b.linePosition),
    [machines],
  )

  const stopLeftByLinePos = useMemo(() => {
    const map = new Map<number, number>()
    for (const m of machines) {
      map.set(m.linePosition, carrierLeftOnLine(m.linePosition, stationCount))
    }
    return map
  }, [machines, stationCount])

  const [machinePhase, setMachinePhase] = useState<MachinePhase>('idle')
  /** Continuous carrier left % along the production line. */
  const [boosterLeftPct, setBoosterLeftPct] = useState(ENTRANCE_LEFT_PCT)
  /**
   * Station linePosition the booster is snapped to, or null when free / at entrance.
   * Machine only operates when this matches the next required station.
   */
  const [snappedLinePos, setSnappedLinePos] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dropFeedback, setDropFeedback] = useState<DropFeedback>(null)
  /** Per-machine 4-digit access code drafts (operator entry). */
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({})

  const lineRef = useRef<HTMLDivElement>(null)
  const lastGoodLeftRef = useRef(ENTRANCE_LEFT_PCT)
  const lastGoodSnapRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  const boosterArrived =
    canInteract &&
    required != null &&
    snappedLinePos === required.linePosition

  /** Operator may drag only between machine cycles (not during approach/work/retreat). */
  const canDrag = run.status === 'running' && !autoMoveBooster

  const showDropHint =
    canDrag && !boosterArrived && required != null && !dragging

  function snapBoosterToLinePos(linePos: number) {
    const left = stopLeftByLinePos.get(linePos)
    if (left == null) return
    setBoosterLeftPct(left)
    setSnappedLinePos(linePos)
    lastGoodLeftRef.current = left
    lastGoodSnapRef.current = linePos
    setDropFeedback(null)
  }

  // Reset when idle or a new unit begins on this step.
  useEffect(() => {
    if (run.status === 'idle') {
      setBoosterLeftPct(ENTRANCE_LEFT_PCT)
      setSnappedLinePos(null)
      setDropFeedback(null)
      setCodeDrafts({})
      lastGoodLeftRef.current = ENTRANCE_LEFT_PCT
      lastGoodSnapRef.current = null
      return
    }

    // Fresh manufacture step: place booster at the entrance for the operator to drag
    // (or at the first required stop when auto-move is enabled).
    if (
      run.status === 'running' &&
      run.nextMachineIndex === 0 &&
      run.completedMachineIds.length === 0
    ) {
      setCodeDrafts({})
      setDropFeedback(null)
      if (autoMoveBooster && required) {
        snapBoosterToLinePos(required.linePosition)
      } else {
        setBoosterLeftPct(ENTRANCE_LEFT_PCT)
        setSnappedLinePos(null)
        lastGoodLeftRef.current = ENTRANCE_LEFT_PCT
        lastGoodSnapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snap helper uses stop map
  }, [
    run.status,
    run.currentStepIndex,
    run.nextMachineIndex,
    run.completedMachineIds.length,
    autoMoveBooster,
    required?.linePosition,
    stopLeftByLinePos,
  ])

  // Auto-move upgrade: after a machine finishes, travel to the next required stop.
  useEffect(() => {
    if (!autoMoveBooster) return
    if (run.status !== 'running' || !required) return
    if (run.completedMachineIds.length === 0) return
    if (snappedLinePos === required.linePosition) return
    snapBoosterToLinePos(required.linePosition)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoMoveBooster,
    run.status,
    run.nextMachineIndex,
    run.completedMachineIds.length,
    required?.linePosition,
    required?.id,
    stopLeftByLinePos,
    snappedLinePos,
  ])

  // Clear wrong-station flash after the next sequence unlocks (machine finished).
  useEffect(() => {
    setDropFeedback(null)
  }, [run.nextMachineIndex])

  // Approach → work → retreat while machine_working.
  useEffect(() => {
    if (run.status !== 'machine_working' || !run.activeMachineId) {
      setMachinePhase('idle')
      return
    }

    // Duration matches MACHINE_APPROACH_MS so MACHINE_CYCLE_MS in SimulationView
    // stays aligned with finishMachineWork. Distance still varies via parkOffset.
    setMachinePhase('approaching')
    const workTimer = window.setTimeout(() => {
      setMachinePhase('working')
    }, MACHINE_APPROACH_MS)
    const retreatTimer = window.setTimeout(() => {
      setMachinePhase('retreating')
    }, MACHINE_APPROACH_MS + MACHINE_WORK_MS)

    return () => {
      window.clearTimeout(workTimer)
      window.clearTimeout(retreatTimer)
    }
  }, [run.status, run.activeMachineId])

  const clearFeedbackLater = useCallback(() => {
    if (feedbackTimerRef.current != null) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setDropFeedback(null)
      feedbackTimerRef.current = null
    }, 1600)
  }, [])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current != null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  function clientXToLeftPct(clientX: number): number {
    const el = lineRef.current
    if (!el) return boosterLeftPct
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return boosterLeftPct
    const raw = ((clientX - rect.left) / rect.width) * 100
    // Keep the carrier roughly on the belt span (with entrance room).
    return Math.min(98, Math.max(ENTRANCE_LEFT_PCT, raw))
  }

  function nearestStop(leftPct: number): { linePos: number; left: number; dist: number } | null {
    let best: { linePos: number; left: number; dist: number } | null = null
    for (const [linePos, left] of stopLeftByLinePos) {
      const dist = Math.abs(left - leftPct)
      if (!best || dist < best.dist) {
        best = { linePos, left, dist }
      }
    }
    return best
  }

  function handleCarrierPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canDrag) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragPointerIdRef.current = e.pointerId
    setDragging(true)
    setDropFeedback(null)
    // Jump under the pointer immediately for responsive grab.
    setBoosterLeftPct(clientXToLeftPct(e.clientX))
  }

  function handleCarrierPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || dragPointerIdRef.current !== e.pointerId) return
    setBoosterLeftPct(clientXToLeftPct(e.clientX))
  }

  function handleCarrierPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    dragPointerIdRef.current = null
    setDragging(false)

    const dropLeft = clientXToLeftPct(e.clientX)
    const nearest = nearestStop(dropLeft)

    if (!nearest || nearest.dist > SNAP_THRESHOLD_PCT) {
      // Not on a valid stop — return to last good placement.
      setBoosterLeftPct(lastGoodLeftRef.current)
      setSnappedLinePos(lastGoodSnapRef.current)
      setDropFeedback('miss')
      clearFeedbackLater()
      return
    }

    // Snap to the stop under the drop.
    setBoosterLeftPct(nearest.left)
    setSnappedLinePos(nearest.linePos)
    lastGoodLeftRef.current = nearest.left
    lastGoodSnapRef.current = nearest.linePos

    const atRequired =
      required != null && nearest.linePos === required.linePosition

    if (!atRequired && canInteract) {
      setDropFeedback('wrong')
      clearFeedbackLater()
    } else {
      setDropFeedback(null)
    }
  }

  function codeMatches(machine: ProcessMachine): boolean {
    const draft = codeDrafts[machine.id] ?? ''
    return draft === machine.accessCode
  }

  function handleCodeChange(machineId: string, raw: string) {
    // Digits only, max 4
    const next = raw.replace(/\D/g, '').slice(0, 4)
    setCodeDrafts((prev) => ({ ...prev, [machineId]: next }))
  }

  function renderMachine(machine: ProcessMachine) {
    const isActive = run.activeMachineId === machine.id
    const isCurrentRequired = canInteract && required?.id === machine.id
    const isWaitingBooster = isCurrentRequired && !boosterArrived
    const codeOk = codeMatches(machine)
    /** May activate only when current, booster present, code correct, not mid-cycle. */
    const canActivate =
      isCurrentRequired && boosterArrived && codeOk && run.status === 'running'
    const isDone = run.completedMachineIds.includes(machine.id)
    const isWorkingPhase = isActive && machinePhase === 'working'
    const isAtLine =
      isActive &&
      (machinePhase === 'approaching' || machinePhase === 'working')
    const isRetreating = isActive && machinePhase === 'retreating'
    const isLocked =
      !isCurrentRequired && !isActive && !isDone

    const offset = parkOffsetOf(machine)
    const draft = codeDrafts[machine.id] ?? ''
    const codeInputEnabled =
      isCurrentRequired && run.status === 'running' && !isDone

    let hint: string | null = null
    if (canActivate) hint = 'Code accepted — activate'
    else if (isCurrentRequired && boosterArrived && !codeOk)
      hint = 'Enter access code'
    else if (isWaitingBooster) hint = 'Drag booster here'
    else if (isActive && machinePhase === 'approaching') hint = 'Approaching…'
    else if (isWorkingPhase) hint = 'Working…'
    else if (isRetreating) hint = 'Returning…'
    else if (isDone) hint = 'Complete'

    return (
      <div
        key={machine.id}
        className="station-bay"
        style={
          {
            gridColumn: machine.linePosition + 1,
            ['--park-offset']: `${offset}rem`,
            ['--drop-min-height']: `${Math.max(1.5, offset + 0.4)}rem`,
          } as CSSProperties
        }
      >
        <div
          className={[
            'factory-machine',
            `factory-machine--${machine.kind}`,
            canActivate ? 'factory-machine--required' : '',
            isWaitingBooster || (isCurrentRequired && !boosterArrived)
              ? 'factory-machine--awaiting'
              : '',
            isCurrentRequired && boosterArrived && !codeOk
              ? 'factory-machine--code-entry'
              : '',
            isWorkingPhase ? 'factory-machine--working' : '',
            isAtLine ? 'factory-machine--at-line' : '',
            isRetreating ? 'factory-machine--retreating' : '',
            isDone ? 'factory-machine--done' : '',
            isLocked ? 'factory-machine--locked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            {
              ['--park-offset']: `${offset}rem`,
              ['--line-approach-y']: `${LINE_APPROACH_Y_REM}rem`,
              ['--machine-travel-ms']: `${MACHINE_APPROACH_MS}ms`,
            } as CSSProperties
          }
        >
          <span className="factory-machine__badge" aria-hidden="true">
            {machine.sequence}
          </span>
          <MachineVisual kind={machine.kind} />
          <span className="factory-machine__label">{machine.name}</span>

          {!isDone && !isActive && (
            <label className="factory-machine__code">
              <span className="factory-machine__code-label">Access code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={4}
                pattern="[0-9]*"
                className={[
                  'factory-machine__code-input',
                  codeOk && isCurrentRequired
                    ? 'factory-machine__code-input--ok'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                value={draft}
                disabled={!codeInputEnabled}
                placeholder="····"
                aria-label={`Access code for ${machine.name}`}
                onChange={(e) => handleCodeChange(machine.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canActivate) {
                    e.preventDefault()
                    onMachineClick(machine.id)
                  }
                }}
              />
            </label>
          )}

          {canActivate && (
            <button
              type="button"
              className="btn btn--primary factory-machine__activate"
              onClick={() => onMachineClick(machine.id)}
            >
              Activate
            </button>
          )}

          {hint && (
            <span
              className={[
                'factory-machine__hint',
                isDone ? 'factory-machine__hint--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {hint}
            </span>
          )}
        </div>
        <div className="station-bay__drop" aria-hidden="true" />
      </div>
    )
  }

  let feedbackCopy: string | null = null
  if (dropFeedback === 'wrong' && required) {
    feedbackCopy = `Wrong station — next is sequence ${required.sequence} (${required.name}).`
  } else if (dropFeedback === 'miss') {
    feedbackCopy = 'Drop on a station stop on the belt.'
  } else if (showDropHint && required) {
    feedbackCopy = `Drag the booster to station ${required.sequence} (${required.name}), then enter its access code.`
  } else if (
    autoMoveBooster &&
    canInteract &&
    required &&
    !boosterArrived
  ) {
    feedbackCopy = `Auto-transfer to station ${required.sequence} (${required.name})…`
  } else if (
    canInteract &&
    required &&
    boosterArrived &&
    !codeMatches(required)
  ) {
    feedbackCopy = `Enter access code ${required.accessCode} on ${required.name}, then Activate.`
  }

  return (
    <div
      className={[
        'manufacture-scene',
        stepDone ? 'manufacture-scene--ready' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="manufacture-scene__sky" aria-hidden="true" />

      {required && !stepDone && (
        <div
          className="manufacture-code-banner"
          role="status"
          aria-live="polite"
        >
          <span className="manufacture-code-banner__kicker">
            Station access code
          </span>
          <span className="manufacture-code-banner__body">
            Station {required.sequence} · {required.name}
          </span>
          <span className="manufacture-code-banner__code" aria-label="Access code">
            {required.accessCode}
          </span>
        </div>
      )}

      <div className="manufacture-floor">
        <div
          className="station-row"
          style={{
            gridTemplateColumns: `repeat(${stationCount}, minmax(0, 1fr))`,
          }}
        >
          {stations.map(renderMachine)}
        </div>

        <div className="production-line" ref={lineRef}>
          <div className="production-line__belt" aria-hidden="true">
            <span className="production-line__groove" />
            <span className="production-line__groove" />
            <span className="production-line__groove" />
            {stations.map((machine) => {
              const isTargetStop =
                (activeMachine?.id === machine.id ||
                  required?.id === machine.id) &&
                !stepDone
              const isNextDropTarget =
                canInteract &&
                required?.id === machine.id &&
                !boosterArrived
              return (
                <span
                  key={`stop-${machine.id}`}
                  className={[
                    'production-line__stop',
                    isTargetStop ? 'production-line__stop--active' : '',
                    isNextDropTarget
                      ? 'production-line__stop--drop-target'
                      : '',
                    run.completedMachineIds.includes(machine.id)
                      ? 'production-line__stop--done'
                      : '',
                    snappedLinePos === machine.linePosition
                      ? 'production-line__stop--occupied'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    left: `${linePosPercent(machine.linePosition, stationCount)}%`,
                  }}
                />
              )
            })}
          </div>

          <div
            className={[
              'production-line__carrier',
              boosterArrived ? 'production-line__carrier--arrived' : '',
              canDrag ? 'production-line__carrier--draggable' : '',
              dragging ? 'production-line__carrier--dragging' : '',
              dropFeedback === 'wrong'
                ? 'production-line__carrier--wrong'
                : '',
              dropFeedback === 'miss' ? 'production-line__carrier--miss' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${boosterLeftPct}%`,
              transitionDuration: dragging ? '0ms' : `${BOOSTER_TRAVEL_MS}ms`,
            }}
            onPointerDown={handleCarrierPointerDown}
            onPointerMove={handleCarrierPointerMove}
            onPointerUp={handleCarrierPointerUp}
            onPointerCancel={handleCarrierPointerUp}
            role="slider"
            aria-label={
              canDrag
                ? 'Booster on the production line — drag to the next station stop'
                : stepDone
                  ? 'Booster manufacture complete'
                  : 'Booster on the production line'
            }
            aria-valuemin={0}
            aria-valuemax={stationCount - 1}
            aria-valuenow={snappedLinePos ?? -1}
            aria-disabled={!canDrag}
          >
            <Booster
              worked={machinePhase === 'working'}
              ready={stepDone}
              label={
                stepDone
                  ? 'Booster manufacture complete'
                  : 'Booster on the production line'
              }
            />
          </div>
        </div>

        {feedbackCopy && (
          <p
            className={[
              'manufacture-scene__feedback',
              dropFeedback === 'wrong' || dropFeedback === 'miss'
                ? 'manufacture-scene__feedback--alert'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-live="polite"
          >
            {feedbackCopy}
          </p>
        )}
      </div>

      {showProceed && onProceed && (
        <div className="manufacture-scene__proceed">
          <button type="button" className="btn btn--primary" onClick={onProceed}>
            Proceed to next step
          </button>
        </div>
      )}
    </div>
  )
}
