import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

interface TrainingViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

/**
 * Training destination reached from Home. For now this is a stub: a pane
 * reserved for an embedded training video (to be added once the video
 * exists) plus a way through to the interactive simulator. No state of its
 * own — mounted only while stage === 'training'.
 */
export function TrainingView({
  activeStage,
  onNavigateStage,
}: TrainingViewProps) {
  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Train" />
      </header>
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section className="view-panel" aria-labelledby="training-heading">
          <header className="view-panel__header">
            <h2 id="training-heading">Train</h2>
            <p className="view-panel__lede">
              Process-excellence training video — coming soon.
            </p>
          </header>

          <div className="view-panel__body">
            <div className="training-video-pane" role="img" aria-label="Training video placeholder">
              <span className="training-video-pane__icon" aria-hidden="true">
                ▶
              </span>
              <p className="training-video-pane__text">
                Training video will be embedded here.
              </p>
            </div>

            <p className="training-cta">
              Prefer to learn by doing?{' '}
              <button
                type="button"
                className="training-cta__link"
                onClick={() => onNavigateStage('round1')}
              >
                Jump into the interactive simulator
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
