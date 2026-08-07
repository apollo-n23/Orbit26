import { useCallback, useEffect, useState } from 'react'
import { RoundSession } from './components/RoundSession'
import { StageNav } from './components/StageNav'
import { GembaWalkthrough } from './views/GembaWalkthrough'
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
 * - `#/round/1` (default) — as-is process, three launches
 * - `#/redesign` — Round 2 redesign workshop
 * - `#/round/2` — Round 2 (play / orbit-complete)
 *
 * Round 1 and Round 2 sessions stay mounted for the app's lifetime (only
 * their visibility toggles) so hopping between stages via the nav bar
 * never loses in-progress state.
 */
function App() {
  const [stage, setStage] = useState<AppStage>(() => stageFromHash())
  // Live lead-time logs from each round's RoundSession, so the Data tab in
  // either round can show both rounds' launches simultaneously — both stay
  // mounted for the app's lifetime, so this is always in sync, not a
  // localStorage snapshot.
  const [round1Entries, setRound1Entries] = useState<LeadTimeEntry[]>([])
  const [round2Entries, setRound2Entries] = useState<LeadTimeEntry[]>([])
  // Round 2's confirmed redesign cost breakdown (null until Confirm), lifted
  // the same way so either round's Data tab can show it live.
  const [round2Cost, setRound2Cost] = useState<RedesignCostBreakdown | null>(
    null,
  )

  useEffect(() => {
    // Normalise empty hash to round 1 so the URL is shareable.
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = hashForStage('round1')
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

  const handleRound2PhaseChange = useCallback(
    (phase: 'redesign' | 'play' | 'orbit-complete') => {
      // Keep the nav in sync when the workshop auto-advances to play
      // (Confirm) without the learner having clicked the "Round 2" tab.
      if (phase !== 'redesign') {
        setStage((prev) => (prev === 'redesign' ? 'round2' : prev))
      }
    },
    [],
  )

  const handleLeadTimeLogChange = useCallback(
    (roundId: RoundId, entries: LeadTimeEntry[]) => {
      if (roundId === 1) {
        setRound1Entries(entries)
      } else {
        setRound2Entries(entries)
      }
    },
    [],
  )

  const handleCostBreakdownChange = useCallback(
    (roundId: RoundId, cost: RedesignCostBreakdown | null) => {
      // Only Round 2 ever has a redesign cost (Round 1 has no redesign).
      if (roundId === 2) setRound2Cost(cost)
    },
    [],
  )

  const round1 = getRoundConfig(1)
  const round2 = getRoundConfig(2)

  return (
    <>
      <StageNav activeStage={stage} onNavigate={navigateToStage} />
      {stage === 'gemba' && <GembaWalkthrough />}
      <RoundSession
        round={round1}
        hidden={stage !== 'round1'}
        onNavigateRound2={() => navigateToStage('redesign')}
        onLeadTimeLogChange={handleLeadTimeLogChange}
        otherRoundEntries={{
          roundId: round2.id,
          roundLabel: round2.label,
          entries: round2Entries,
        }}
        onCostBreakdownChange={handleCostBreakdownChange}
        otherRoundCostBreakdown={round2Cost}
      />
      <RoundSession
        round={round2}
        hidden={stage !== 'redesign' && stage !== 'round2'}
        requestedPhase={
          stage === 'redesign' ? 'redesign' : stage === 'round2' ? 'play' : undefined
        }
        onPhaseChange={handleRound2PhaseChange}
        onLeadTimeLogChange={handleLeadTimeLogChange}
        otherRoundEntries={{
          roundId: round1.id,
          roundLabel: round1.label,
          entries: round1Entries,
        }}
        onCostBreakdownChange={handleCostBreakdownChange}
      />
    </>
  )
}

export default App
