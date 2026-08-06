import { useCallback, useEffect, useState } from 'react'
import { RoundSession } from './components/RoundSession'
import { getRoundConfig } from './data/rounds'
import {
  hashForRound,
  roundIdFromHash,
  type RoundId,
} from './types/round'
import './App.css'

/**
 * Root shell: hash routes so tutors can deep-link rounds.
 * - `#/round/1` (default) — as-is process, three launches
 * - `#/round/2` — Round 2 (baseline copy for now)
 */
function App() {
  const [roundId, setRoundId] = useState<RoundId>(() => roundIdFromHash())

  useEffect(() => {
    // Normalise empty hash to round 1 so the URL is shareable.
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = hashForRound(1)
    }

    const onHashChange = () => {
      setRoundId(roundIdFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goToRound2 = useCallback(() => {
    window.location.hash = hashForRound(2)
  }, [])

  const round = getRoundConfig(roundId)

  return (
    <RoundSession
      key={round.id}
      round={round}
      onNavigateRound2={round.id === 1 ? goToRound2 : undefined}
    />
  )
}

export default App
