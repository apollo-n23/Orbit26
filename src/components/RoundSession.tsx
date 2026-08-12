import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SiteBrand } from './SiteBrand'
import { StageNav } from './StageNav'
import { ViewNav } from './ViewNav'
import { RedesignWorkshop } from './RedesignWorkshop'
import { SimulationView } from '../views/SimulationView'
import { DataView } from '../views/DataView'
import { OrbitCompleteScene } from '../views/OrbitCompleteScene'
import {
  beginRun,
  completeHaulStep,
  failMachineWork,
  finishLaunchPrepAction,
  finishLaunchSequenceAction,
  finishMachineWork,
  isRunTimerActive,
  leadTimeEntryFromRun,
  markOnPad,
  metricsFromRun,
  pauseRun,
  proceedToNextStep,
  resumeRun,
  startMachineWork,
} from '../lib/simulation'
import type { AppView } from '../types/views'
import type {
  LeadTimeEntry,
  ProcessVersion,
  RedesignCostBreakdown,
  RunState,
} from '../types/process'
import { INITIAL_RUN_STATE, LAUNCH_SEQ_CAPCOM_STATION_ID } from '../types/process'
import { randomHeightAchievedMiles } from '../lib/flightMetrics'
import { resolveLaunchSeqRemovedIds } from '../lib/processEdit'
import { downloadTextFile } from '../lib/fileDownload'
import { buildRedesignChoicesSummary } from '../lib/redesignSummary'
import type { AppStage, RoundConfig, RoundId } from '../types/round'
import { ROCKETS_PER_ROUND, hashForRound } from '../types/round'
import { getRoundConfig } from '../data/rounds'
import {
  loadRound1AverageLeadTimeMs,
  loadRound1LaunchLeadTimesMs,
  saveRound1LeadTimeResults,
} from '../lib/roundMetrics'
import type { UploadSaveResult } from '../lib/saveFile'

type RoundPhase = 'redesign' | 'play' | 'orbit-complete'

/** Full state needed to resume a round exactly as it was when saved. */
export interface RoundRestoreData {
  process: ProcessVersion
  leadTimeLog: LeadTimeEntry[]
  /** Only meaningful when restoring To-be — As-is's own average/per-launch times. */
  round1AverageMs?: number | null
  round1LaunchesMs?: number[] | null
}

/** Imperative handle so App can restore BOTH rounds from a single uploaded save file. */
export interface RoundSessionHandle {
  restoreState: (data: RoundRestoreData) => void
}

interface RoundSessionProps {
  round: RoundConfig
  /** Persistent stage nav, rendered beneath this round's PMI brand banner. */
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
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
  /** Reports this round's live process (redesign choices) for the save-file download. */
  onProcessChange?: (roundId: RoundId, process: ProcessVersion) => void
  /** The OTHER round's live process, for this round's Data-tab save-file download. */
  otherRoundProcess?: ProcessVersion
  /**
   * Reads back a previously downloaded save file's text and restores BOTH
   * rounds' state (owned by App, since it holds refs to both RoundSessions).
   */
  onUploadSaveFileText?: (fileText: string) => UploadSaveResult
}

export const RoundSession = forwardRef<RoundSessionHandle, RoundSessionProps>(
  function RoundSession(
    {
      round,
      activeStage,
      onNavigateStage,
      onNavigateRound2,
      hidden = false,
      requestedPhase,
      onPhaseChange,
      onLeadTimeLogChange,
      otherRoundEntries,
      onCostBreakdownChange,
      otherRoundCostBreakdown,
      onProcessChange,
      otherRoundProcess,
      onUploadSaveFileText,
    },
    ref,
  ) {
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
  /** As-is average (ms) for To-be Data comparison — from localStorage. */
  const [round1AverageMs, setRound1AverageMs] = useState<number | null>(() =>
    round.id === 2 ? loadRound1AverageLeadTimeMs() : null,
  )
  /** As-is per-rocket lead times (ms) for side-by-side visual compare. */
  const [round1LaunchesMs, setRound1LaunchesMs] = useState<number[] | null>(
    () => (round.id === 2 ? loadRound1LaunchLeadTimesMs() : null),
  )
  /** Transient reminder shown when the operator attempts to interact while paused. */
  const [pauseNotice, setPauseNotice] = useState<string | null>(null)
  const pauseNoticeTimerRef = useRef<number | null>(null)

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
    setPauseNotice(null)
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

  // Same for the live process (redesign choices) — needed so either round's
  // Data tab can build a save file containing BOTH rounds' full state.
  useEffect(() => {
    onProcessChange?.(round.id, process)
  }, [process, round.id, onProcessChange])

  useEffect(() => {
    if (!isRunTimerActive(run)) return
    const id = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(id)
  }, [run.status, run.runStartedAt, run.runEndedAt, run.pausedAt])

  // Clear any pending pause-notice timer on unmount.
  useEffect(
    () => () => {
      if (pauseNoticeTimerRef.current != null) {
        window.clearTimeout(pauseNoticeTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (run.status !== 'complete') return
    // Capcom removed (To-be redesign) → no altitude telemetry path to log.
    const capcomRemoved = resolveLaunchSeqRemovedIds(process).includes(
      LAUNCH_SEQ_CAPCOM_STATION_ID,
    )
    const entry = leadTimeEntryFromRun(run, {
      costBreakdown: process.costBreakdown,
      ...(capcomRemoved
        ? { heightStatus: 'no-capcom' as const }
        : { heightAchievedMiles: randomHeightAchievedMiles() }),
      defectCount: defectCountRef.current,
    })
    if (!entry) return
    if (entry.runNumber <= lastLoggedRunRef.current) return
    lastLoggedRunRef.current = entry.runNumber
    setLeadTimeLog((prev) => {
      const next = [...prev, entry]
      if (next.length >= ROCKETS_PER_ROUND) {
        // Persist As-is average + per-launch times so To-be can compare.
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
    process.launchSeqRemovedIds,
    round.id,
  ])

  const metrics = useMemo(() => metricsFromRun(run, now), [run, now])
  const roundComplete = leadTimeLog.length >= ROCKETS_PER_ROUND
  const rocketsLaunched = leadTimeLog.length
  const paused = run.pausedAt != null
  /**
   * This round's total defects — booster explosions (haul road, step 2) plus
   * damaged-machine failures (manufacture, step 1) — summed across logged
   * launches. Same formula the Data tab uses for "Total defects", so the
   * banner counter always matches it.
   */
  const roundDefectTotal = useMemo(
    () => leadTimeLog.reduce((sum, e) => sum + (e.defectCount ?? 0), 0),
    [leadTimeLog],
  )

  const handleBlockedInteraction = useCallback(() => {
    setPauseNotice(
      'Session paused — resume it with the pause toggle before continuing.',
    )
    if (pauseNoticeTimerRef.current != null) {
      window.clearTimeout(pauseNoticeTimerRef.current)
    }
    pauseNoticeTimerRef.current = window.setTimeout(() => {
      setPauseNotice(null)
      pauseNoticeTimerRef.current = null
    }, 3200)
  }, [])

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
    setPauseNotice(null)
  }

  function handleStartSession() {
    if (roundComplete || phase !== 'play') return
    setSessionActive(true)
    setActiveView('simulation')
    setRun(INITIAL_RUN_STATE)
    setPauseNotice(null)
  }

  function handleRunProcess() {
    if (!sessionActive || roundComplete || phase !== 'play') return
    if (paused) {
      handleBlockedInteraction()
      return
    }
    if (run.status !== 'idle' && run.status !== 'complete') return
    if (run.completedRuns >= ROCKETS_PER_ROUND) return
    setNow(Date.now())
    defectCountRef.current = 0
    setRun((prev) => beginRun(prev))
  }

  function handleTogglePause() {
    if (!sessionActive) return
    setNow(Date.now())
    setRun((prev) => (prev.pausedAt != null ? resumeRun(prev) : pauseRun(prev)))
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

  const handleMachineFailed = useCallback(() => {
    // A damaged machine's failed Activate attempt (step 1) is a defect, same
    // as a haul-road explosion (step 2) — both accumulate into this launch's
    // defectCountRef, folded into its LeadTimeEntry.defectCount on completion.
    defectCountRef.current += 1
    setRun((prev) => failMachineWork(prev))
  }, [])

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

  // Missed the extend-boom or swing-over-vehicle sweet spot (step 3) — a
  // defect, same as a haul-road explosion (step 2) or a machine failure (step 1).
  const handleLaunchPrepDefect = useCallback(() => {
    defectCountRef.current += 1
  }, [])

  const handleLaunchPrepActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchPrepAction(process, prev))
  }, [process])

  const handleLaunchSequenceActionComplete = useCallback(() => {
    setRun((prev) => finishLaunchSequenceAction(process, prev))
  }, [process])

  // Same "Save my current choices" snapshot as the redesign workshop —
  // only meaningful once a round has actually been through a redesign
  // (process.costBreakdown is only ever stamped at that Confirm step).
  const handleSaveChoices = useCallback(() => {
    if (!process.costBreakdown) return
    downloadTextFile(
      'orbit26-redesign-choices.txt',
      buildRedesignChoicesSummary(process, round.label, process.costBreakdown),
    )
  }, [process, round.label])

  // Orbit-complete's "View detailed results" — leaves the summary for this
  // same round's own Data tab. Only ever changes phase/view, never touches
  // leadTimeLog, so the round's results stay exactly as logged.
  const handleViewResults = useCallback(() => {
    setPhase('play')
    setActiveView('data')
  }, [])

  // "Upload data" on the Data tab restores this round's saved process +
  // lead-time log exactly as they were at download time. Phase is derived
  // rather than stored: a full log means orbit-complete; otherwise a round
  // that allows redesign but has no confirmed costBreakdown yet is still at
  // the workshop, same rule Confirm itself uses to advance to play.
  useImperativeHandle(
    ref,
    () => ({
      restoreState(data) {
        setProcess(structuredClone(data.process))
        setLeadTimeLog(data.leadTimeLog)
        lastLoggedRunRef.current = data.leadTimeLog.length
        defectCountRef.current = 0
        setRun(INITIAL_RUN_STATE)
        setSessionActive(false)
        setPauseNotice(null)
        setActiveView('data')
        setPhase(
          data.leadTimeLog.length >= ROCKETS_PER_ROUND
            ? 'orbit-complete'
            : round.allowsRedesign && data.process.costBreakdown == null
              ? 'redesign'
              : 'play',
        )
        if (round.id === 1 && data.leadTimeLog.length >= ROCKETS_PER_ROUND) {
          saveRound1LeadTimeResults(data.leadTimeLog)
        }
        if (round.id === 2) {
          if (data.round1AverageMs !== undefined) {
            setRound1AverageMs(data.round1AverageMs)
          }
          if (data.round1LaunchesMs !== undefined) {
            setRound1LaunchesMs(data.round1LaunchesMs)
          }
        }
      },
    }),
    [round.id, round.allowsRedesign],
  )

  if (phase === 'orbit-complete') {
    return (
      <div className="app-shell" style={hidden ? { display: 'none' } : undefined}>
        <SiteBrand
          subtitle={round.label}
          activeStage={activeStage}
          onNavigate={onNavigateStage}
        />
        <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
        <main className="app-main app-main--orbit">
          <OrbitCompleteScene
            round={round}
            leadTimes={leadTimeLog}
            round2ShareUrl={round2ShareUrl}
            onGoToRound2={round.id === 1 ? onNavigateRound2 : undefined}
            onViewResults={handleViewResults}
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
        <SiteBrand
          subtitle={`${round.label} · Redesign`}
          activeStage={activeStage}
          onNavigate={onNavigateStage}
        />
        <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
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
      <SiteBrand
        subtitle={round.label}
        activeStage={activeStage}
        onNavigate={onNavigateStage}
      />
      <StageNav
        activeStage={activeStage}
        onNavigate={onNavigateStage}
        metrics={metrics}
        rocketsLaunched={rocketsLaunched}
        rocketsGoal={ROCKETS_PER_ROUND}
        defectCount={roundDefectTotal}
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
            onStartSession={handleStartSession}
            onRunProcess={handleRunProcess}
            onMachineClick={handleMachineClick}
            onMachineWorkFinished={handleMachineWorkFinished}
            onMachineFailed={handleMachineFailed}
            onProceedToNextStep={handleProceedToNextStep}
            onReachedPad={handleReachedPad}
            onHaulMountToPad={handleHaulMountToPad}
            onHaulExplode={handleHaulExplode}
            onLaunchPrepDefect={handleLaunchPrepDefect}
            onLaunchPrepActionComplete={handleLaunchPrepActionComplete}
            onLaunchSequenceActionComplete={handleLaunchSequenceActionComplete}
            onSaveChoices={process.costBreakdown ? handleSaveChoices : undefined}
            paused={paused}
            onTogglePause={handleTogglePause}
            onBlockedInteraction={handleBlockedInteraction}
            pauseNotice={pauseNotice}
          />
        )}
        {activeView === 'data' && (
          <DataView
            rounds={
              round.id === 1
                ? [
                    {
                      roundId: 1,
                      roundLabel: round.label,
                      entries: leadTimeLog,
                      process,
                    },
                    {
                      roundId: 2,
                      roundLabel: otherRoundEntries?.roundLabel ?? 'To-be',
                      entries: otherRoundEntries?.entries ?? [],
                      process: otherRoundProcess ?? getRoundConfig(2).process,
                    },
                  ]
                : [
                    {
                      roundId: 1,
                      roundLabel: otherRoundEntries?.roundLabel ?? 'As-is',
                      entries: otherRoundEntries?.entries ?? [],
                      process: otherRoundProcess ?? getRoundConfig(1).process,
                    },
                    {
                      roundId: 2,
                      roundLabel: round.label,
                      entries: leadTimeLog,
                      process,
                    },
                  ]
            }
            rocketsGoal={ROCKETS_PER_ROUND}
            round2CostBreakdown={
              round.id === 2
                ? process.costBreakdown ?? null
                : otherRoundCostBreakdown ?? null
            }
            onUploadData={onUploadSaveFileText}
          />
        )}
      </main>
    </div>
  )
  },
)

