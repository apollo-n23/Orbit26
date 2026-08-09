import type { AppStage } from '../types/round'

interface StageNavProps {
  activeStage: AppStage
  onNavigate: (stage: AppStage) => void
}

const STAGES: { id: AppStage; label: string }[] = [
  { id: 'gemba', label: 'Gemba' },
  { id: 'as-is', label: 'As-is' },
  { id: 'redesign', label: 'Redesign' },
  { id: 'to-be', label: 'To-be' },
]

/**
 * Persistent top-level nav so a learner/tutor can hop directly between
 * a Gemba walkthrough of the as-is process, As-is play, the To-be redesign
 * workshop, and To-be play — independent of the linear
 * as-is → redesign → to-be launches flow. The Customer Portal and
 * Regulation buttons sit off to the side — separate from the learning-loop
 * group (voice of customer / external regulatory reference).
 */
export function StageNav({ activeStage, onNavigate }: StageNavProps) {
  const isHome = activeStage === 'home'
  const isCustomers = activeStage === 'customers'
  const isRegulation = activeStage === 'regulation'
  return (
    <nav className="stage-nav" aria-label="Process stages">
      <button
        type="button"
        className={`stage-nav__home-btn${isHome ? ' stage-nav__home-btn--active' : ''}`}
        aria-current={isHome ? 'page' : undefined}
        onClick={() => onNavigate('home')}
      >
        Home
      </button>
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
      <div className="stage-nav__side">
        <button
          type="button"
          className={`stage-nav__regulation-btn${isRegulation ? ' stage-nav__regulation-btn--active' : ''}`}
          aria-current={isRegulation ? 'page' : undefined}
          onClick={() => onNavigate('regulation')}
        >
          Regulation
        </button>
        <button
          type="button"
          className={`stage-nav__customer-btn${isCustomers ? ' stage-nav__customer-btn--active' : ''}`}
          aria-current={isCustomers ? 'page' : undefined}
          onClick={() => onNavigate('customers')}
        >
          Customer Portal
        </button>
      </div>
    </nav>
  )
}
