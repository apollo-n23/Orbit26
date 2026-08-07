import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`
const ORB_LAUNCH_PAD_SRC = `${import.meta.env.BASE_URL}OrbLaunchPad.png`

interface HomeViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

interface IntranetTile {
  stage: AppStage
  title: string
  description: string
  icon: string
}

const TILES: IntranetTile[] = [
  {
    stage: 'training',
    title: 'Train',
    description:
      'Onboarding and process-excellence training materials for Assembly, Integration, and Launch Preparation staff.',
    icon: '🎓',
  },
  {
    stage: 'annual-report',
    title: 'Annual Report',
    description:
      "This year's results for shareholders and staff — performance, outlook, and the challenges ahead.",
    icon: '📊',
  },
  {
    stage: 'invoices',
    title: 'Create Invoices',
    description: 'Raise and manage customer invoices for completed launches.',
    icon: '🧾',
  },
]

/**
 * Default landing screen — an in-fiction Orb-it corporate intranet home
 * page. Purely a hub: no state of its own, mounted only while
 * stage === 'home' (same pattern as GembaWalkthrough / CustomerPortalView).
 */
export function HomeView({ activeStage, onNavigateStage }: HomeViewProps) {
  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Orb-it Intranet" />
      </header>
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section className="view-panel" aria-labelledby="home-heading">
          <header className="view-panel__header home-header">
            <span className="home-header__logo-badge">
              <img
                src={ORBIT_LOGO_SRC}
                alt=""
                className="home-header__logo"
                width={120}
                height={120}
                decoding="async"
              />
            </span>
            <div>
              <h2 id="home-heading">Welcome back</h2>
              <p className="view-panel__lede">
                Orb-it's internal hub for training, company reporting, and
                billing. Pick a destination below.
              </p>
            </div>
            <div className="home-header__schematic" aria-hidden="true">
              <svg
                className="home-schematic"
                viewBox="0 0 240 110"
                preserveAspectRatio="xMidYMid meet"
              >
                <g transform="translate(120,55)">
                  <g className="home-schematic__ring home-schematic__ring--a">
                    <ellipse rx="95" ry="30" />
                    <circle className="home-schematic__sat" cx="95" cy="0" r="3.2" />
                  </g>
                  <g className="home-schematic__ring home-schematic__ring--b">
                    <ellipse rx="58" ry="40" />
                    <circle
                      className="home-schematic__sat home-schematic__sat--b"
                      cx="-58"
                      cy="0"
                      r="2.6"
                    />
                  </g>
                </g>
                <line className="home-schematic__link" x1="20" y1="15" x2="70" y2="40" />
                <line className="home-schematic__link" x1="215" y1="95" x2="165" y2="60" />
                <line className="home-schematic__link" x1="205" y1="20" x2="165" y2="45" />
                <circle className="home-schematic__node" cx="20" cy="15" r="2.6" />
                <circle className="home-schematic__node" cx="215" cy="95" r="2.6" />
                <circle className="home-schematic__node" cx="205" cy="20" r="2.2" />
              </svg>
            </div>
          </header>

          <div className="view-panel__body">
            <div className="intranet-tiles">
              {TILES.map((tile) => (
                <button
                  key={tile.stage}
                  type="button"
                  className="intranet-tile"
                  onClick={() => onNavigateStage(tile.stage)}
                >
                  <span className="intranet-tile__icon" aria-hidden="true">
                    {tile.icon}
                  </span>
                  <span className="intranet-tile__text">
                    <span className="intranet-tile__title">{tile.title}</span>
                    <span className="intranet-tile__description">
                      {tile.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <figure className="home-marketing">
              <img
                src={ORB_LAUNCH_PAD_SRC}
                alt="An Orb-it launch vehicle standing ready on the pad"
                className="home-marketing__image"
                decoding="async"
              />
              <figcaption className="home-marketing__caption">
                Every satellite starts here — on the pad, ready for liftoff.
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
    </div>
  )
}
