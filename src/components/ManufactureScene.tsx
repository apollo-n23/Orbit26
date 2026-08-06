import type { ProcessMachine, RunState } from '../types/process'
import { Booster } from './Booster'

interface ManufactureSceneProps {
  machines: ProcessMachine[]
  run: RunState
  onMachineClick: (machineId: string) => void
  /** Shown when manufacture machines are done and another step follows. */
  showProceed?: boolean
  onProceed?: () => void
}

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

  const top = machines.filter((m) => m.sequence <= 2)
  const bottom = machines.filter((m) => m.sequence > 2)

  function renderMachine(machine: ProcessMachine) {
    const isRequired = canInteract && required?.id === machine.id
    const isWorking = run.activeMachineId === machine.id
    const isDone = run.completedMachineIds.includes(machine.id)
    const isLocked = !isRequired && !isWorking && !isDone

    return (
      <button
        key={machine.id}
        type="button"
        className={[
          'factory-machine',
          `factory-machine--${machine.kind}`,
          isRequired ? 'factory-machine--required' : '',
          isWorking ? 'factory-machine--working' : '',
          isDone ? 'factory-machine--done' : '',
          isLocked ? 'factory-machine--locked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={!isRequired}
        onClick={() => onMachineClick(machine.id)}
        aria-label={`${machine.sequence}. ${machine.name}${
          isRequired ? ' — click to operate' : isDone ? ' — complete' : ''
        }`}
      >
        <span className="factory-machine__badge" aria-hidden="true">
          {machine.sequence}
        </span>
        <MachineVisual kind={machine.kind} />
        <span className="factory-machine__label">{machine.name}</span>
        {isRequired && (
          <span className="factory-machine__hint">Click to operate</span>
        )}
        {isWorking && (
          <span className="factory-machine__hint">Working…</span>
        )}
        {isDone && (
          <span className="factory-machine__hint factory-machine__hint--done">
            Complete
          </span>
        )}
      </button>
    )
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

      <div className="factory-row factory-row--top">
        {top.map(renderMachine)}
      </div>

      <div className="production-line">
        <div className="production-line__belt" aria-hidden="true">
          <span className="production-line__groove" />
          <span className="production-line__groove" />
          <span className="production-line__groove" />
        </div>

        <Booster
          worked={Boolean(run.activeMachineId)}
          ready={stepDone}
          label={
            stepDone
              ? 'Booster manufacture complete'
              : 'Booster on the production line'
          }
        />
      </div>

      <div className="factory-row factory-row--bottom">
        {bottom.map(renderMachine)}
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
