import type { SessionMetrics } from '../types/process'
import { formatLeadTime } from '../lib/simulation'

interface TopBarProps {
  metrics: SessionMetrics
  onStartSession: () => void
  sessionActive: boolean
  roundLabel?: string
  rocketsLaunched?: number
  rocketsGoal?: number
}

export function TopBar({
  metrics,
  onStartSession,
  sessionActive,
  roundLabel,
  rocketsLaunched = 0,
  rocketsGoal = 3,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <span className="top-bar__mark" aria-hidden="true" />
        <div className="top-bar__titles">
          <h1 className="top-bar__title">Orb-it</h1>
          <p className="top-bar__subtitle">
            {roundLabel ?? 'Process Excellence Simulator'}
          </p>
        </div>
      </div>

      <dl className="top-bar__metrics">
        <div className="metric">
          <dt className="metric__label">Lead Time</dt>
          <dd className="metric__value">
            <span className="metric__number">
              {formatLeadTime(metrics.leadTime)}
            </span>
          </dd>
        </div>
        <div className="metric">
          <dt className="metric__label">Launches</dt>
          <dd className="metric__value">
            <span className="metric__number">
              {rocketsLaunched}/{rocketsGoal}
            </span>
          </dd>
        </div>
      </dl>

      <div className="top-bar__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onStartSession}
          disabled={sessionActive || rocketsLaunched >= rocketsGoal}
        >
          {sessionActive ? 'Session Active' : 'Start Session'}
        </button>
      </div>
    </header>
  )
}
