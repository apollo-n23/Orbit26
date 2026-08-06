import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from './components/TopBar'
import { ViewNav } from './components/ViewNav'
import { SimulationView } from './views/SimulationView'
import { DataView } from './views/DataView'
import { ComparisonView } from './views/ComparisonView'
import { BASELINE_PROCESS } from './data/baselineProcess'
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
} from './lib/simulation'
import type { AppView } from './types/views'
import type { LeadTimeEntry, ProcessVersion, RunState } from './types/process'
import {
  INITIAL_RUN_STATE,
  MAX_RUNS_PER_SESSION,
} from './types/process'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState<AppView>('simulation')
  const [sessionActive, setSessionActive] = useState(false)
  const [process] = useState<ProcessVersion>(() =>
    structuredClone(BASELINE_PROCESS),
  )
  const [run, setRun] = useState<RunState>(INITIAL_RUN_STATE)
  /** Ongoing board of completed end-to-end lead times (Data tab). */
  const [leadTimeLog, setLeadTimeLog] = useState<LeadTimeEntry[]>([])
  /** Wall-clock sample so Lead Time ticks while a unit run is open. */
  const [now, setNow] = useState(() => Date.now())
  const lastLoggedRunRef = useRef(0)

  useEffect(() => {
    if (!isRunTimerActive(run)) return

    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 200)

    return () => window.clearInterval(id)
  }, [run.status, run.runStartedAt, run.runEndedAt])

  // When a full unit finishes (launch complete), append one lap to the Data board.
  useEffect(() => {
    if (run.status !== 'complete') return
    const entry = leadTimeEntryFromRun(run)
    if (!entry) return
    if (entry.runNumber <= lastLoggedRunRef.current) return
    lastLoggedRunRef.current = entry.runNumber
    setLeadTimeLog((prev) => [...prev, entry])
  }, [run.status, run.completedRuns, run.runEndedAt, run.runStartedAt])

  const metrics = useMemo(() => metricsFromRun(run, now), [run, now])

  function handleStartSession() {
    setSessionActive(true)
    setActiveView('simulation')
    setRun(INITIAL_RUN_STATE)
    // Keep lead-time board across the session arming; clear only if desired later.
  }

  function handleRunProcess() {
    if (!sessionActive) return
    if (run.status !== 'idle' && run.status !== 'complete') return
    if (run.completedRuns >= MAX_RUNS_PER_SESSION) return
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

  return (
    <div className="app-shell">
      <TopBar
        metrics={metrics}
        onStartSession={handleStartSession}
        sessionActive={sessionActive}
      />
      <ViewNav activeView={activeView} onChangeView={setActiveView} />
      <main className="app-main">
        {activeView === 'simulation' && (
          <SimulationView
            process={process}
            run={run}
            sessionActive={sessionActive}
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
        {activeView === 'data' && <DataView entries={leadTimeLog} />}
        {activeView === 'comparison' && <ComparisonView />}
      </main>
    </div>
  )
}

export default App
