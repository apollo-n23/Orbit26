import type { SessionMetrics } from '../types/process'
import { formatMetric } from '../lib/simulation'

interface TopBarProps {
  metrics: SessionMetrics
  onStartSession: () => void
  sessionActive: boolean
}

export function TopBar({ metrics, onStartSession, sessionActive }: TopBarProps) {
  const display = [
    {
      label: 'Cycle Time',
      value: formatMetric(metrics.cycleTime, 0),
      unit: 'min',
    },
    {
      label: 'Yield',
      value: formatMetric(metrics.yield, 0),
      unit: '%',
    },
    {
      label: 'Flow Efficiency',
      value: formatMetric(metrics.flowEfficiency, 0),
      unit: '%',
    },
  ]

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <span className="top-bar__mark" aria-hidden="true" />
        <div className="top-bar__titles">
          <h1 className="top-bar__title">Orb-it</h1>
          <p className="top-bar__subtitle">Process Excellence Simulator</p>
        </div>
      </div>

      <dl className="top-bar__metrics">
        {display.map((metric) => (
          <div key={metric.label} className="metric">
            <dt className="metric__label">{metric.label}</dt>
            <dd className="metric__value">
              <span className="metric__number">{metric.value}</span>
              {metric.unit ? (
                <span className="metric__unit">{metric.unit}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <div className="top-bar__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onStartSession}
          disabled={sessionActive}
        >
          {sessionActive ? 'Session Active' : 'Start Session'}
        </button>
      </div>
    </header>
  )
}
