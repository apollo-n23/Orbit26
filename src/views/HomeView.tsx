import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

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
            <img
              src={ORBIT_LOGO_SRC}
              alt=""
              className="home-header__logo"
              width={40}
              height={40}
              decoding="async"
            />
            <div>
              <h2 id="home-heading">Welcome back</h2>
              <p className="view-panel__lede">
                Orb-it's internal hub for training, company reporting, and
                billing. Pick a destination below.
              </p>
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
                  <span className="intranet-tile__title">{tile.title}</span>
                  <span className="intranet-tile__description">
                    {tile.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
