import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

/** Public asset — cache-bust if the file is replaced in place. */
const ORBIT_TEAM_SRC = `${import.meta.env.BASE_URL}OrbitTeam.jpg?v=2`

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

          <div className="view-panel__body training-body">
            <div className="training-video-pane" role="img" aria-label="Training video placeholder">
              <span className="training-video-pane__icon" aria-hidden="true">
                ▶
              </span>
              <p className="training-video-pane__text">
                Training video will be embedded here.
              </p>
            </div>

            <section
              className="training-instructions"
              aria-labelledby="training-instructions-heading"
            >
              <h3 id="training-instructions-heading">
                Orb-it Employee Instructions
              </h3>

              {/*
                Team photo is a direct child of the instructions pane (not
                nested under paragraphs) so it always paints; min-height on
                the figure reserves space before the image decodes.
              */}
              <figure className="training-team">
                <img
                  src={ORBIT_TEAM_SRC}
                  alt="Orb-it operations team on the launch pad watching a booster roll out"
                  className="training-team__image"
                  width={1408}
                  height={1408}
                  decoding="async"
                />
                <figcaption className="training-team__caption">
                  The Orb-it launch team — Assembly, Haul, Launch Prep, and
                  Mission Control — standing ready on the pad.
                </figcaption>
              </figure>

              <p>
                Welcome to Orb-it. Your job is to launch rockets to low-Earth
                orbit for our customers. You&apos;ll assemble the booster in
                the factory, haul it to the pad on the crawler, prep the
                vehicle for flight, and oversee the launch sequence itself.
                Exciting work — and every minute of lead time matters.
              </p>

              <p>
                At the top of every page you&apos;ll find the stage navigation
                bar. Use it to move through the exercise in order (or hop
                around as needed):
              </p>

              <ol className="training-instructions__steps">
                <li>
                  <button
                    type="button"
                    className="training-instructions__stage-btn"
                    onClick={() => onNavigateStage('gemba')}
                  >
                    Gemba
                  </button>
                  <span>
                    Walk the process at your own pace. Open any as-is step —
                    Manufacture, Haul, Launch prep, or Launch sequence — to
                    observe how the work really runs today.
                  </span>
                </li>
                <li>
                  <button
                    type="button"
                    className="training-instructions__stage-btn"
                    onClick={() => onNavigateStage('round1')}
                  >
                    Round 1
                  </button>
                  <span>
                    Experience the process as it is. Run three full launches
                    and feel the friction in lead time before you change
                    anything.
                  </span>
                </li>
                <li>
                  <button
                    type="button"
                    className="training-instructions__stage-btn"
                    onClick={() => onNavigateStage('redesign')}
                  >
                    Redesign
                  </button>
                  <span>
                    Redesign the value stream — line layout, haul road,
                    launch-prep tech, and launch sequence. Budget is limited
                    (and most choices don&apos;t refund), so invest only where
                    the data and customer voice justify it.
                  </span>
                </li>
                <li>
                  <button
                    type="button"
                    className="training-instructions__stage-btn"
                    onClick={() => onNavigateStage('round2')}
                  >
                    Round 2
                  </button>
                  <span>
                    Test the changes you locked in. Run three more launches
                    and compare lead times (and redesign cost) against
                    Round 1 on the Data board.
                  </span>
                </li>
              </ol>

              <p>
                Have fun — and don&apos;t forget the{' '}
                <button
                  type="button"
                  className="training-instructions__inline-link"
                  onClick={() => onNavigateStage('customers')}
                >
                  Customer Portal
                </button>
                {' '}
                for the voice of the customer: cadence, altitude (exactly 75
                miles), haul-road incidents, and everything else our
                Starfeed followers have to say.
              </p>
            </section>

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
