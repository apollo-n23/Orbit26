import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from './TopBar'
import { SiteBrand } from './SiteBrand'
import { ViewNav } from './ViewNav'
import { RedesignWorkshop } from './RedesignWorkshop'
import { SimulationView } from '../views/SimulationView'
import { DataView } from '../views/DataView'
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
import type {
  LeadTimeEntry,
  ProcessVersion,
  RedesignCostBreakdown,
  RunState,
} from '../types/process'
import { INITIAL_RUN_STATE } from '../types/process'
import { randomHeightAchievedMiles } from '../lib/flightMetrics'
import type { RoundConfig, RoundId } from '../types/round'
import { ROCKETS_PER_ROUND, hashForRound } from '../types/round'
import {
  loadRound1AverageLeadTimeMs,
  loadRound1LaunchLeadTimesMs,
  saveRound1LeadTimeResults,
} from '../lib/roundMetrics'

type RoundPhase = 'redesign' | 'play' | 'orbit-complete'

interface RoundSessionProps {
  round: RoundConfig
  onNavigateRound2?: () => void
  /** Hide without unmounting, so stage-nav hops don't lose session state. */
  hidden?: boolean
  /**
   * External nav request for this round's phase (redesign vs play).
   * Only acted on when it changes after mount — a fresh deep link still
   * lands on the round's natural starting phase.
   */
  requestedPhase?: RoundPhase
  /** Reports internal phase changes so the stage nav can stay in sync. */
  onPhaseChange?: (phase: RoundPhase) => void
  /** Reports this round's live lead-time log so the other round's Data tab can show it too. */
  onLeadTimeLogChange?: (roundId: RoundId, entries: LeadTimeEntry[]) => void
  /** The OTHER round's live lead-time log, for this round's Data tab. */
  otherRoundEntries?: {
    roundId: RoundId
    roundLabel: string
    entries: LeadTimeEntry[]
  }
  /** Reports this round's confirmed redesign cost so the other round's Data tab can show it too. */
  onCostBreakdownChange?: (
    roundId: RoundId,
    cost: RedesignCostBreakdown | null,
  ) => void
  /** The OTHER round's confirmed redesign cost, for this round's Data tab. */
  otherRoundCostBreakdown?: RedesignCostBreakdown | null
}

export function RoundSession({
  round,
  onNavigateRound2,
  hidden = false,
  requestedPhase,
  onPhaseChange,
  onLeadTimeLogChange,
  otherRoundEntries,
  onCostBreakdownChange,
  otherRoundCostBreakdown,
}: RoundSessionProps) {
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
  /** Explosions on the haul road (step 2) so far this launch attempt. */
  const defectCountRef = useRef(0)
  /** Round 1 average (ms) for Round 2 Data comparison — from localStorage. */
  const [round1AverageMs, setRound1AverageMs] = useState<number | null>(() =>
    round.id === 2 ? loadRound1AverageLeadTimeMs() : null,
  )
  /** Round 1 per-rocket lead times (ms) for side-by-side visual compare. */
  const [round1LaunchesMs, setRound1LaunchesMs] = useState<number[] | null>(
    () => (round.id === 2 ? loadRound1LaunchLeadTimesMs() : null),
  )

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
    defectCountRef.current = 0
    setRound1AverageMs(
      round.id === 2 ? loadRound1AverageLeadTimeMs() : null,
    )
    setRound1LaunchesMs(
      round.id === 2 ? loadRound1LaunchLeadTimesMs() : null,
    )
    // round fields read intentionally only when round.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id])

  // Stage-nav can request a phase jump (redesign <-> play) for this round.
  // Ignore the value on first mount — a fresh deep link should still land
  // on the round's natural starting phase, not be force-jumped.
  const requestedPhaseAppliedRef = useRef(requestedPhase)
  useEffect(() => {
    if (requestedPhase === requestedPhaseAppliedRef.current) return
    requestedPhaseAppliedRef.current = requestedPhase
    if (!requestedPhase) return
    if (requestedPhase === 'redesign') {
      setPhase((prev) => {
        if (prev === 'redesign') return prev
        // Revisiting the workshop mid-round or after completion restarts
        // this round's launches under whatever design is confirmed next.
        setSessionActive(false)
        setRun(INITIAL_RUN_STATE)
        setLeadTimeLog([])
        lastLoggedRunRef.current = 0
        defectCountRef.current = 0
        return 'redesign'
      })
    } else if (requestedPhase === 'play') {
      setPhase((prev) => (prev === 'redesign' ? 'play' : prev))
    }
  }, [requestedPhase])

  // Report phase changes upward so the stage nav stays in sync when this
  // round auto-advances (e.g. Confirm redesign -> play) without a nav click.
  const lastReportedPhaseRef = useRef(phase)
  useEffect(() => {
    if (phase === lastReportedPhaseRef.current) return
    lastReportedPhaseRef.current = phase
    onPhaseChange?.(phase)
  }, [phase, onPhaseChange])

  // Report this round's live lead-time log upward so App can hand it to the
  // OTHER round's Data tab (both rounds stay mounted, so this stays live).
  useEffect(() => {
    onLeadTimeLogChange?.(round.id, leadTimeLog)
  }, [leadTimeLog, round.id, onLeadTimeLogChange])

  // Same for the confirmed redesign cost breakdown (undefined until Confirm).
  useEffect(() => {
    onCostBreakdownChange?.(round.id, process.costBreakdown ?? null)
  }, [process.costBreakdown, round.id, onCostBreakdownChange])

  useEffect(() => {
    if (!isRunTimerActive(run)) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [run.status, run.runStartedAt, run.runEndedAt])

  useEffect(() => {
    if (run.status !== 'complete') return
    const entry = leadTimeEntryFromRun(run, {
      costBreakdown: process.costBreakdown,
      heightAchievedMiles: randomHeightAchievedMiles(),
      defectCount: defectCountRef.current,
    })
    if (!entry) return
    if (entry.runNumber <= lastLoggedRunRef.current) return
    lastLoggedRunRef.current = entry.runNumber
    setLeadTimeLog((prev) => {
      const next = [...prev, entry]
      if (next.length >= ROCKETS_PER_ROUND) {
        // Persist Round 1 average + per-launch times so Round 2 can compare.
        if (round.id === 1) {
          saveRound1LeadTimeResults(next)
        }
        window.setTimeout(() => setPhase('orbit-complete'), 600)
      }
      return next
    })
  }, [
    run.status,
    run.completedRuns,
    run.runEndedAt,
    run.runStartedAt,
    process.costBreakdown,
    round.id,
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
    // launchPrepTechs (and other redesign fields) must survive into play.
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
    defectCountRef.current = 0
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

  const handleHaulExplode = useCallback(() => {
    defectCountRef.current += 1
  }, [])

  const handleLaunchPrepActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchPrepAction(process, prev))
  }, [process])

  const handleLaunchSequenceActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchSequenceAction(process, prev))
  }, [process])

  if (phase === 'orbit-complete') {
    return (
      <div className="app-shell" style={hidden ? { display: 'none' } : undefined}>
        <header className="top-bar top-bar--round-done">
          <SiteBrand subtitle={round.label} />
        </header>
        <main className="app-main app-main--orbit">
          <OrbitCompleteScene
            round={round}
            leadTimes={leadTimeLog}
            round2ShareUrl={round2ShareUrl}
            onGoToRound2={round.id === 1 ? onNavigateRound2 : undefined}
            round1AverageMs={round.id === 2 ? round1AverageMs : null}
            round1LaunchesMs={round.id === 2 ? round1LaunchesMs : null}
          />
        </main>
      </div>
    )
  }

  if (phase === 'redesign') {
    return (
      <div className="app-shell" style={hidden ? { display: 'none' } : undefined}>
        <header className="top-bar top-bar--round-done">
          <SiteBrand subtitle={`${round.label} · Redesign`} />
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
    <div className="app-shell" style={hidden ? { display: 'none' } : undefined}>
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
            onHaulExplode={handleHaulExplode}
            onLaunchPrepActionComplete={handleLaunchPrepActionComplete}
            onLaunchSequenceActionComplete={handleLaunchSequenceActionComplete}
          />
        )}
        {activeView === 'data' && (
          <DataView
            rounds={
              round.id === 1
                ? [
                    { roundId: 1, roundLabel: round.label, entries: leadTimeLog },
                    otherRoundEntries ?? {
                      roundId: 2,
                      roundLabel: 'Round 2',
                      entries: [],
                    },
                  ]
                : [
                    otherRoundEntries ?? {
                      roundId: 1,
                      roundLabel: 'Round 1',
                      entries: [],
                    },
                    { roundId: 2, roundLabel: round.label, entries: leadTimeLog },
                  ]
            }
            rocketsGoal={ROCKETS_PER_ROUND}
            round2CostBreakdown={
              round.id === 2
                ? process.costBreakdown ?? null
                : otherRoundCostBreakdown ?? null
            }
          />
        )}
      </main>
    </div>
  )
}
