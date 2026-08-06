import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from './TopBar'
import { ViewNav } from './ViewNav'
import { RedesignWorkshop } from './RedesignWorkshop'
import { SimulationView } from '../views/SimulationView'
import { DataView } from '../views/DataView'
import { ComparisonView } from '../views/ComparisonView'
import { OrbitCompleteScene } from '../views/OrbitCompleteScene'
import {
  beginRun,
  completeHaulStep,
  finishLaunchPrepAction,
  finishLaunchSequenceAction,
  finishMachineWork,
  isRunTimerActive,
  leadTimeEntryFromRun,
  markOnPad,
  metricsFromRun,
  proceedToNextStep,
  startMachineWork,
} from '../lib/simulation'
import type { AppView } from '../types/views'
import type { LeadTimeEntry, ProcessVersion, RunState } from '../types/process'
import { INITIAL_RUN_STATE } from '../types/process'
import type { RoundConfig } from '../types/round'
import { ROCKETS_PER_ROUND, hashForRound } from '../types/round'

type RoundPhase = 'redesign' | 'play' | 'orbit-complete'

interface RoundSessionProps {
  round: RoundConfig
  onNavigateRound2?: () => void
}

export function RoundSession({ round, onNavigateRound2 }: RoundSessionProps) {
  const [activeView, setActiveView] = useState<AppView>('simulation')
  const [sessionActive, setSessionActive] = useState(false)
  const [phase, setPhase] = useState<RoundPhase>(() =>
    round.allowsRedesign ? 'redesign' : 'play',
  )
  const [process, setProcess] = useState<ProcessVersion>(() =>
    structuredClone(round.process),
  )
  const [run, setRun] = useState<RunState>(INITIAL_RUN_STATE)
  const [leadTimeLog, setLeadTimeLog] = useState<LeadTimeEntry[]>([])
  const [now, setNow] = useState(() => Date.now())
  const lastLoggedRunRef = useRef(0)

  // Reset only when navigating to a different round id.
  // Do NOT depend on round.process — that would wipe a confirmed redesign
  // if the parent re-renders with a new config object reference.
  useEffect(() => {
    setActiveView('simulation')
    setSessionActive(false)
    setPhase(round.allowsRedesign ? 'redesign' : 'play')
    setProcess(structuredClone(round.process))
    setRun(INITIAL_RUN_STATE)
    setLeadTimeLog([])
    lastLoggedRunRef.current = 0
    // round fields read intentionally only when round.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id])

  useEffect(() => {
    if (!isRunTimerActive(run)) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [run.status, run.runStartedAt, run.runEndedAt])

  useEffect(() => {
    if (run.status !== 'complete') return
    const entry = leadTimeEntryFromRun(run, {
      roadCost: process.roadCost,
    })
    if (!entry) return
    if (entry.runNumber <= lastLoggedRunRef.current) return
    lastLoggedRunRef.current = entry.runNumber
    setLeadTimeLog((prev) => {
      const next = [...prev, entry]
      if (next.length >= ROCKETS_PER_ROUND) {
        window.setTimeout(() => setPhase('orbit-complete'), 600)
      }
      return next
    })
  }, [
    run.status,
    run.completedRuns,
    run.runEndedAt,
    run.runStartedAt,
    process.roadCost,
  ])

  const metrics = useMemo(() => metricsFromRun(run, now), [run, now])
  const roundComplete = leadTimeLog.length >= ROCKETS_PER_ROUND
  const rocketsLaunched = leadTimeLog.length

  const round2ShareUrl = useMemo(() => {
    if (typeof window === 'undefined') return hashForRound(2)
    return `${window.location.origin}${window.location.pathname}${hashForRound(2)}`
  }, [])

  function handleConfirmRedesign(nextProcess: ProcessVersion) {
    // Deep-clone so later play/mutation cannot touch the workshop draft graph.
    setProcess(structuredClone(nextProcess))
    setPhase('play')
    setSessionActive(false)
    setRun(INITIAL_RUN_STATE)
    setActiveView('simulation')
  }

  function handleStartSession() {
    if (roundComplete || phase !== 'play') return
    setSessionActive(true)
    setActiveView('simulation')
    setRun(INITIAL_RUN_STATE)
  }

  function handleRunProcess() {
    if (!sessionActive || roundComplete || phase !== 'play') return
    if (run.status !== 'idle' && run.status !== 'complete') return
    if (run.completedRuns >= ROCKETS_PER_ROUND) return
    setNow(Date.now())
    setRun((prev) => beginRun(prev))
  }

  const handleMachineClick = useCallback(
    (machineId: string) => {
      setRun((prev) => startMachineWork(process, prev, machineId))
    },
    [process],
  )

  const handleMachineWorkFinished = useCallback(() => {
    setRun((prev) => finishMachineWork(process, prev))
  }, [process])

  const handleProceedToNextStep = useCallback(() => {
    setRun((prev) => proceedToNextStep(process, prev))
  }, [process])

  const handleReachedPad = useCallback(() => {
    setRun((prev) => markOnPad(prev))
  }, [])

  const handleHaulMountToPad = useCallback(() => {
    setRun((prev) => completeHaulStep(process, prev))
  }, [process])

  const handleLaunchPrepActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchPrepAction(process, prev))
  }, [process])

  const handleLaunchSequenceActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchSequenceAction(process, prev))
  }, [process])

  if (phase === 'orbit-complete') {
    return (
      <div className="app-shell">
        <header className="top-bar top-bar--round-done">
          <div className="top-bar__brand">
            <span className="top-bar__mark" aria-hidden="true" />
            <div className="top-bar__titles">
              <h1 className="top-bar__title">Orb-it</h1>
              <p className="top-bar__subtitle">{round.label}</p>
            </div>
          </div>
        </header>
        <main className="app-main app-main--orbit">
          <OrbitCompleteScene
            round={round}
            leadTimes={leadTimeLog}
            round2ShareUrl={round2ShareUrl}
            onGoToRound2={round.id === 1 ? onNavigateRound2 : undefined}
          />
        </main>
      </div>
    )
  }

  if (phase === 'redesign') {
    return (
      <div className="app-shell">
        <header className="top-bar top-bar--round-done">
          <div className="top-bar__brand">
            <span className="top-bar__mark" aria-hidden="true" />
            <div className="top-bar__titles">
              <h1 className="top-bar__title">Orb-it</h1>
              <p className="top-bar__subtitle">{round.label} · Redesign</p>
            </div>
          </div>
        </header>
        <main className="app-main">
          <RedesignWorkshop
            initialProcess={process}
            roundLabel={round.label}
            onConfirm={handleConfirmRedesign}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        metrics={metrics}
        onStartSession={handleStartSession}
        sessionActive={sessionActive}
        roundLabel={round.label}
        rocketsLaunched={rocketsLaunched}
        rocketsGoal={ROCKETS_PER_ROUND}
      />
      <ViewNav activeView={activeView} onChangeView={setActiveView} />
      <main className="app-main">
        {activeView === 'simulation' && (
          <SimulationView
            process={process}
            run={run}
            sessionActive={sessionActive}
            maxRuns={ROCKETS_PER_ROUND}
            roundTitle={round.title}
            onRunProcess={handleRunProcess}
            onMachineClick={handleMachineClick}
            onMachineWorkFinished={handleMachineWorkFinished}
            onProceedToNextStep={handleProceedToNextStep}
            onReachedPad={handleReachedPad}
            onHaulMountToPad={handleHaulMountToPad}
            onLaunchPrepActionComplete={handleLaunchPrepActionComplete}
            onLaunchSequenceActionComplete={handleLaunchSequenceActionComplete}
          />
        )}
        {activeView === 'data' && (
          <DataView
            entries={leadTimeLog}
            rocketsGoal={ROCKETS_PER_ROUND}
            roundLabel={round.label}
          />
        )}
        {activeView === 'comparison' && <ComparisonView />}
      </main>
    </div>
  )
}
