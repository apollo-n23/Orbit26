import { useCallback, useEffect, useRef, useState } from 'react'
import { RoundSession, type RoundSessionHandle } from './components/RoundSession'
import { GembaWalkthrough } from './views/GembaWalkthrough'
import { CustomerPortalView } from './views/CustomerPortalView'
import { RegulationView } from './views/RegulationView'
import { HomeView } from './views/HomeView'
import { TrainingView } from './views/TrainingView'
import { AnnualReportView } from './views/AnnualReportView'
import { CreateInvoicesView } from './views/CreateInvoicesView'
import { getRoundConfig } from './data/rounds'
import {
  hashForStage,
  stageFromHash,
  type AppStage,
  type RoundId,
} from './types/round'
import type {
  LeadTimeEntry,
  ProcessVersion,
  RedesignCostBreakdown,
} from './types/process'
import { averageLeadTimeMs, launchDurationsMs } from './lib/roundMetrics'
import { parseSaveFileText, type UploadSaveResult } from './lib/saveFile'
import './App.css'

/**
 * Root shell: hash routes so tutors can deep-link stages.
 * - `#/home` (default) — Orb-it intranet landing page
 * - `#/round/1` (also `#/as-is`) — As-is process, three launches
 * - `#/redesign` — To-be redesign workshop
 * - `#/round/2` (also `#/to-be`) — To-be (play / orbit-complete)
 * - `#/customers` — Customer Portal (Starfeed VOC feed)
 * - `#/regulation` — fictional NSLA regulation library
 *
 * As-is and To-be sessions stay mounted for the app's lifetime (only
 * their visibility toggles) so hopping between stages via the nav bar
 * never loses in-progress state.
 */
function App() {
  const [stage, setStage] = useState<AppStage>(() => stageFromHash())
  // Live lead-time logs from each round's RoundSession, so the Data tab in
  // either stage can show both As-is and To-be launches simultaneously — both
  // stay mounted for the app's lifetime, so this is always in sync, not a
  // localStorage snapshot.
  const [asIsEntries, setAsIsEntries] = useState<LeadTimeEntry[]>([])
  const [toBeEntries, setToBeEntries] = useState<LeadTimeEntry[]>([])
  // To-be confirmed redesign cost breakdown (null until Confirm), lifted
  // the same way so either stage's Data tab can show it live.
  const [toBeCost, setToBeCost] = useState<RedesignCostBreakdown | null>(null)
  // Live process (redesign choices) from each round, lifted the same way so
  // either stage's Data tab can build a save file with BOTH rounds' state.
  const [asIsProcess, setAsIsProcess] = useState<ProcessVersion>(
    () => getRoundConfig(1).process,
  )
  const [toBeProcess, setToBeProcess] = useState<ProcessVersion>(
    () => getRoundConfig(2).process,
  )
  // Imperative handles so an upload on EITHER round's Data tab can restore
  // BOTH rounds' state — both RoundSessions stay mounted for the app's
  // lifetime, so this always reaches the live session, not a stale clone.
  const asIsSessionRef = useRef<RoundSessionHandle>(null)
  const toBeSessionRef = useRef<RoundSessionHandle>(null)

  useEffect(() => {
    // Normalise empty hash to home so the URL is shareable.
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = hashForStage('home')
    }

    const onHashChange = () => {
      setStage(stageFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigateToStage = useCallback((next: AppStage) => {
    window.location.hash = hashForStage(next)
  }, [])

  const handleToBePhaseChange = useCallback(
    (phase: 'redesign' | 'play' | 'orbit-complete') => {
      // Keep the nav in sync when the workshop auto-advances to play
      // (Confirm) without the learner having clicked the "To-be" tab.
      if (phase !== 'redesign') {
        setStage((prev) => (prev === 'redesign' ? 'to-be' : prev))
      }
    },
    [],
  )

  const handleLeadTimeLogChange = useCallback(
    (roundId: RoundId, entries: LeadTimeEntry[]) => {
      if (roundId === 1) {
        setAsIsEntries(entries)
      } else {
        setToBeEntries(entries)
      }
    },
    [],
  )

  const handleCostBreakdownChange = useCallback(
    (roundId: RoundId, cost: RedesignCostBreakdown | null) => {
      // Only To-be ever has a redesign cost (As-is has no redesign).
      if (roundId === 2) setToBeCost(cost)
    },
    [],
  )

  const handleProcessChange = useCallback(
    (roundId: RoundId, process: ProcessVersion) => {
      if (roundId === 1) {
        setAsIsProcess(process)
      } else {
        setToBeProcess(process)
      }
    },
    [],
  )

  // "Upload data" on either round's Data tab: restores BOTH rounds from a
  // single previously-downloaded save file (see lib/saveFile.ts) via the
  // imperative handles below — this is the only place that can reach both
  // RoundSessions at once, since each Data tab only owns its own round.
  const handleUploadSaveFileText = useCallback(
    (fileText: string): UploadSaveResult => {
      const save = parseSaveFileText(fileText)
      if (!save) {
        return {
          ok: false,
          message:
            'This file is not a valid Orb-it save file — download one from the Data tab first.',
        }
      }
      const round1Data = save.rounds.find((r) => r.roundId === 1)
      const round2Data = save.rounds.find((r) => r.roundId === 2)
      if (round1Data) {
        asIsSessionRef.current?.restoreState({
          process: round1Data.process,
          leadTimeLog: round1Data.leadTimeLog,
        })
      }
      if (round2Data) {
        toBeSessionRef.current?.restoreState({
          process: round2Data.process,
          leadTimeLog: round2Data.leadTimeLog,
          round1AverageMs: round1Data
            ? averageLeadTimeMs(round1Data.leadTimeLog)
            : null,
          round1LaunchesMs: round1Data
            ? launchDurationsMs(round1Data.leadTimeLog)
            : null,
        })
      }
      return { ok: true, message: 'Save file loaded — both rounds restored.' }
    },
    [],
  )

  const asIs = getRoundConfig(1)
  const toBe = getRoundConfig(2)

  return (
    <>
      {stage === 'home' && (
        <HomeView activeStage={stage} onNavigateStage={navigateToStage} />
      )}
      {stage === 'training' && (
        <TrainingView activeStage={stage} onNavigateStage={navigateToStage} />
      )}
      {stage === 'annual-report' && (
        <AnnualReportView
          activeStage={stage}
          onNavigateStage={navigateToStage}
        />
      )}
      {stage === 'invoices' && (
        <CreateInvoicesView
          activeStage={stage}
          onNavigateStage={navigateToStage}
        />
      )}
      {stage === 'gemba' && (
        <GembaWalkthrough
          activeStage={stage}
          onNavigateStage={navigateToStage}
        />
      )}
      {stage === 'customers' && (
        <CustomerPortalView
          activeStage={stage}
          onNavigateStage={navigateToStage}
        />
      )}
      {stage === 'regulation' && (
        <RegulationView
          activeStage={stage}
          onNavigateStage={navigateToStage}
        />
      )}
      <RoundSession
        ref={asIsSessionRef}
        round={asIs}
        activeStage={stage}
        onNavigateStage={navigateToStage}
        hidden={stage !== 'as-is'}
        onNavigateRound2={() => navigateToStage('redesign')}
        onLeadTimeLogChange={handleLeadTimeLogChange}
        otherRoundEntries={{
          roundId: toBe.id,
          roundLabel: toBe.label,
          entries: toBeEntries,
        }}
        onCostBreakdownChange={handleCostBreakdownChange}
        otherRoundCostBreakdown={toBeCost}
        onProcessChange={handleProcessChange}
        otherRoundProcess={toBeProcess}
        onUploadSaveFileText={handleUploadSaveFileText}
      />
      <RoundSession
        ref={toBeSessionRef}
        round={toBe}
        activeStage={stage}
        onNavigateStage={navigateToStage}
        hidden={stage !== 'redesign' && stage !== 'to-be'}
        requestedPhase={
          stage === 'redesign' ? 'redesign' : stage === 'to-be' ? 'play' : undefined
        }
        onPhaseChange={handleToBePhaseChange}
        onLeadTimeLogChange={handleLeadTimeLogChange}
        otherRoundEntries={{
          roundId: asIs.id,
          roundLabel: asIs.label,
          entries: asIsEntries,
        }}
        onCostBreakdownChange={handleCostBreakdownChange}
        onProcessChange={handleProcessChange}
        otherRoundProcess={asIsProcess}
        onUploadSaveFileText={handleUploadSaveFileText}
      />
    </>
  )
}

export default App
