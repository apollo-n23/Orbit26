import type { AppStage } from '../types/round'

interface StageNavProps {
  activeStage: AppStage
  onNavigate: (stage: AppStage) => void
}

const STAGES: { id: AppStage; label: string }[] = [
  { id: 'gemba', label: 'Gemba' },
  { id: 'round1', label: 'Round 1' },
  { id: 'redesign', label: 'Redesign' },
  { id: 'round2', label: 'Round 2' },
]

/**
 * Persistent top-level nav so a tutor/learner can hop directly between
 * a Gemba walkthrough of Round 1 as-is, Round 1, the Round 2 redesign
 * workshop, and Round 2 play — independent of the linear
 * as-is → redesign → launches flow. The Customer Portal is a separate,
 * differently-styled button off to the side — it isn't part of that
 * learning-loop flow, just an outside voice-of-customer view.
 */
export function StageNav({ activeStage, onNavigate }: StageNavProps) {
  const isHome = activeStage === 'home'
  const isCustomers = activeStage === 'customers'
  return (
    <nav className="stage-nav" aria-label="Round stages">
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
      <button
        type="button"
        className={`stage-nav__customer-btn${isCustomers ? ' stage-nav__customer-btn--active' : ''}`}
        aria-current={isCustomers ? 'page' : undefined}
        onClick={() => onNavigate('customers')}
      >
        Customer Portal
      </button>
    </nav>
  )
}
