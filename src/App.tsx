import { useCallback, useEffect, useState } from 'react'
import { RoundSession } from './components/RoundSession'
import { StageNav } from './components/StageNav'
import { getRoundConfig } from './data/rounds'
import {
  hashForStage,
  stageFromHash,
  type AppStage,
} from './types/round'
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

  const round1 = getRoundConfig(1)
  const round2 = getRoundConfig(2)

  return (
    <>
      <StageNav activeStage={stage} onNavigate={navigateToStage} />
      <RoundSession
        round={round1}
        hidden={stage !== 'round1'}
        onNavigateRound2={() => navigateToStage('redesign')}
      />
      <RoundSession
        round={round2}
        hidden={stage === 'round1'}
        requestedPhase={
          stage === 'redesign' ? 'redesign' : stage === 'round2' ? 'play' : undefined
        }
        onPhaseChange={handleRound2PhaseChange}
      />
    </>
  )
}

export default App
