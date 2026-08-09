import { useCallback, useEffect, useState } from 'react'
import { RoundSession } from './components/RoundSession'
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
import type { LeadTimeEntry, RedesignCostBreakdown } from './types/process'
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
      />
      <RoundSession
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
      />
    </>
  )
}

export default App
