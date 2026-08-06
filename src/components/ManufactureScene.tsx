import { useEffect, useMemo, useState } from 'react'
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
}

type MachinePhase = 'idle' | 'approaching' | 'working' | 'retreating'

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

export function ManufactureScene({
  machines,
  run,
  onMachineClick,
  showProceed = false,
  onProceed,
}: ManufactureSceneProps) {
  const required = machines[run.nextMachineIndex]
  const stepDone = run.status === 'step_complete'
  const canInteract = run.status === 'running' && required != null

  const activeMachine = run.activeMachineId
    ? machines.find((m) => m.id === run.activeMachineId)
    : undefined

  /** Station the booster should sit at (current work target or next required). */
  const targetMachine = activeMachine ?? required ?? machines[machines.length - 1]
  const targetLinePos = targetMachine?.linePosition ?? 0
  const stationCount = Math.max(
    machines.length,
    ...machines.map((m) => m.linePosition + 1),
    1,
  )

  const stations = useMemo(
    () => [...machines].sort((a, b) => a.linePosition - b.linePosition),
    [machines],
  )

  const [boosterArrived, setBoosterArrived] = useState(false)
  const [machinePhase, setMachinePhase] = useState<MachinePhase>('idle')
  /** -1 = entrance (left of first stop) before first travel. */
  const [boosterLinePos, setBoosterLinePos] = useState(-1)

  // Travel booster to the station for the next / active machine.
  useEffect(() => {
    if (run.status === 'idle') {
      setBoosterLinePos(-1)
      setBoosterArrived(false)
      return
    }

    // Stay put while a machine is operating on the booster already under it.
    if (run.status === 'machine_working') {
      setBoosterLinePos(targetLinePos)
      setBoosterArrived(true)
      return
    }

    setBoosterArrived(false)
    // Kick CSS transition on next frame so entrance → first stop animates.
    const frame = window.requestAnimationFrame(() => {
      setBoosterLinePos(targetLinePos)
    })
    const id = window.setTimeout(() => {
      setBoosterArrived(true)
    }, BOOSTER_TRAVEL_MS)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(id)
    }
  }, [
    targetLinePos,
    run.status,
    run.nextMachineIndex,
    run.currentStepIndex,
  ])

  // Approach → work → retreat while machine_working.
  useEffect(() => {
    if (run.status !== 'machine_working' || !run.activeMachineId) {
      setMachinePhase('idle')
      return
    }

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

  function renderMachine(machine: ProcessMachine) {
    const isActive = run.activeMachineId === machine.id
    const isRequired =
      canInteract && required?.id === machine.id && boosterArrived
    const isWaitingBooster =
      canInteract && required?.id === machine.id && !boosterArrived
    const isDone = run.completedMachineIds.includes(machine.id)
    const isWorkingPhase = isActive && machinePhase === 'working'
    const isAtLine =
      isActive &&
      (machinePhase === 'approaching' || machinePhase === 'working')
    const isRetreating = isActive && machinePhase === 'retreating'
    const isLocked =
      !isRequired && !isActive && !isDone && !isWaitingBooster

    let hint: string | null = null
    if (isRequired) hint = 'Click to operate'
    else if (isWaitingBooster) hint = 'Booster en route…'
    else if (isActive && machinePhase === 'approaching') hint = 'Approaching…'
    else if (isWorkingPhase) hint = 'Working…'
    else if (isRetreating) hint = 'Returning…'
    else if (isDone) hint = 'Complete'

    return (
      <div
        key={machine.id}
        className="station-bay"
        style={{ gridColumn: machine.linePosition + 1 }}
      >
        <button
          type="button"
          className={[
            'factory-machine',
            `factory-machine--${machine.kind}`,
            isRequired ? 'factory-machine--required' : '',
            isWaitingBooster ? 'factory-machine--awaiting' : '',
            isWorkingPhase ? 'factory-machine--working' : '',
            isAtLine ? 'factory-machine--at-line' : '',
            isRetreating ? 'factory-machine--retreating' : '',
            isDone ? 'factory-machine--done' : '',
            isLocked ? 'factory-machine--locked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={!isRequired}
          onClick={() => onMachineClick(machine.id)}
          aria-label={`${machine.sequence}. ${machine.name}${
            isRequired
              ? ' — click to operate'
              : isDone
                ? ' — complete'
                : isWaitingBooster
                  ? ' — waiting for booster'
                  : ''
          }`}
        >
          <span className="factory-machine__badge" aria-hidden="true">
            {machine.sequence}
          </span>
          <MachineVisual kind={machine.kind} />
          <span className="factory-machine__label">{machine.name}</span>
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
        </button>
        <div className="station-bay__drop" aria-hidden="true" />
      </div>
    )
  }

  const boosterLeft =
    boosterLinePos < 0 ? -6 : carrierLeftOnLine(boosterLinePos, stationCount)

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

      <div className="manufacture-floor">
        <div
          className="station-row"
          style={{
            gridTemplateColumns: `repeat(${stationCount}, minmax(0, 1fr))`,
          }}
        >
          {stations.map(renderMachine)}
        </div>

        <div className="production-line">
          <div className="production-line__belt" aria-hidden="true">
            <span className="production-line__groove" />
            <span className="production-line__groove" />
            <span className="production-line__groove" />
            {stations.map((machine) => (
              <span
                key={`stop-${machine.id}`}
                className={[
                  'production-line__stop',
                  (activeMachine?.id === machine.id ||
                    required?.id === machine.id) &&
                  !stepDone
                    ? 'production-line__stop--active'
                    : '',
                  run.completedMachineIds.includes(machine.id)
                    ? 'production-line__stop--done'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${linePosPercent(machine.linePosition, stationCount)}%` }}
              />
            ))}
          </div>

          <div
            className={[
              'production-line__carrier',
              boosterArrived ? 'production-line__carrier--arrived' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: `${boosterLeft}%`,
              transitionDuration: `${BOOSTER_TRAVEL_MS}ms`,
            }}
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
