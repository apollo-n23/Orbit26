import type { AppStage } from '../types/round'
import type { SessionMetrics } from '../types/process'
import { formatLeadTime } from '../lib/simulation'

interface StageNavProps {
  activeStage: AppStage
  onNavigate: (stage: AppStage) => void
  /** Only passed during a round's play phase — omit to hide the metrics cluster entirely. */
  metrics?: SessionMetrics
  rocketsLaunched?: number
  rocketsGoal?: number
  /** Booster explosions (haul road) + damaged-machine failures (manufacture), this round. */
  defectCount?: number
}

const STAGES: { id: AppStage; label: string }[] = [
  { id: 'gemba', label: 'Gemba' },
  { id: 'as-is', label: 'As-is' },
  { id: 'redesign', label: 'Redesign' },
  { id: 'to-be', label: 'To-be' },
]

function ClockIcon() {
  return (
    <svg
      className="stage-nav__metric-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function RocketIcon() {
  return (
    <svg
      className="stage-nav__metric-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5c2.5 2 3.8 5.2 3.8 8.7 0 2-.5 3.9-1.3 5.4h-5c-.8-1.5-1.3-3.4-1.3-5.4 0-3.5 1.3-6.7 3.8-8.7z" />
      <circle cx="12" cy="10" r="1.4" />
      <path d="M8.5 14.5 6 17.5v2.5l2.8-1.8" />
      <path d="M15.5 14.5 18 17.5v2.5l-2.8-1.8" />
      <path d="M10.3 16.6 9.5 21.5h5l-.8-4.9" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg
      className="stage-nav__metric-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21c-3.6 0-6.2-2.5-6.2-6 0-2.6 1.5-4 2.3-5.9.5 1 .6 1.9 1.4 1.9.7 0 .9-3.4 1.7-5.5 2.7 1.7 6.8 5.3 6.8 9.5 0 3.5-2.6 6-6 6z" />
    </svg>
  )
}

/**
 * Simulation Navigator: lets a learner/tutor hop directly between a Gemba
 * walkthrough of the as-is process, As-is play, the To-be redesign
 * workshop, and To-be play — independent of the linear
 * as-is → redesign → to-be launches flow. Ring-fenced in its own labeled
 * group, deliberately separate from the site-wide Home / Regulation /
 * Customer Portal buttons, which live in the top banner (`SiteBrand`).
 * Also carries the live Lead Time / Launches / Defects metrics — only while
 * a round is actually playing (`metrics` omitted everywhere else).
 */
export function StageNav({
  activeStage,
  onNavigate,
  metrics,
  rocketsLaunched = 0,
  rocketsGoal = 3,
  defectCount,
}: StageNavProps) {
  return (
    <nav className="stage-nav" aria-label="Simulation Navigator">
      <span className="stage-nav__label">Simulation Navigator</span>
      <div className="stage-nav__group">
        {STAGES.map((stage) => {
          const isActive = stage.id === activeStage
          return (
            <button
              key={stage.id}
              type="button"
              className={`stage-nav__item${isActive ? ' stage-nav__item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(stage.id)}
            >
              {stage.label}
            </button>
          )
        })}
      </div>

      {metrics && (
        <dl className="stage-nav__metrics">
          <div className="stage-nav__metric">
            <ClockIcon />
            <div className="stage-nav__metric-text">
              <dt className="stage-nav__metric-label">Lead Time</dt>
              <dd className="stage-nav__metric-value">
                {formatLeadTime(metrics.leadTime)}
              </dd>
            </div>
          </div>
          <div className="stage-nav__metric">
            <RocketIcon />
            <div className="stage-nav__metric-text">
              <dt className="stage-nav__metric-label">Launches</dt>
              <dd className="stage-nav__metric-value">
                {rocketsLaunched}/{rocketsGoal}
              </dd>
            </div>
          </div>
          <div
            className={
              defectCount && defectCount > 0
                ? 'stage-nav__metric stage-nav__metric--alert'
                : 'stage-nav__metric'
            }
          >
            <FlameIcon />
            <div className="stage-nav__metric-text">
              <dt className="stage-nav__metric-label">Defects</dt>
              <dd className="stage-nav__metric-value">{defectCount ?? 0}</dd>
            </div>
          </div>
        </dl>
      )}
    </nav>
  )
}
