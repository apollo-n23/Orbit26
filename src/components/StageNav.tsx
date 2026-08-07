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
 * as-is → redesign → launches flow.
 */
export function StageNav({ activeStage, onNavigate }: StageNavProps) {
  return (
    <nav className="stage-nav" aria-label="Round stages">
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
    </nav>
  )
}
