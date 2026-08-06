import { useCallback, useMemo, useState } from 'react'
import { TopBar } from './components/TopBar'
import { ViewNav } from './components/ViewNav'
import { SimulationView } from './views/SimulationView'
import { MapView } from './views/MapView'
import { ComparisonView } from './views/ComparisonView'
import { BASELINE_PROCESS } from './data/baselineProcess'
import {
  beginRun,
  completeHaulStep,
  finishMachineWork,
  markOnPad,
  metricsFromRun,
  proceedToNextStep,
  startMachineWork,
} from './lib/simulation'
import type { AppView } from './types/views'
import type { ProcessVersion, RunState } from './types/process'
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

  const metrics = useMemo(() => metricsFromRun(run), [run])

  function handleStartSession() {
    setSessionActive(true)
    setActiveView('simulation')
    setRun(INITIAL_RUN_STATE)
  }

  function handleRunProcess() {
    if (!sessionActive) return
    if (run.status !== 'idle' && run.status !== 'complete') return
    if (run.completedRuns >= MAX_RUNS_PER_SESSION) return
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

  const handleHaulReorient = useCallback(() => {
    setRun((prev) => completeHaulStep(process, prev))
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
            onHaulReorient={handleHaulReorient}
          />
        )}
        {activeView === 'map' && <MapView />}
        {activeView === 'comparison' && <ComparisonView />}
      </main>
    </div>
  )
}

export default App
