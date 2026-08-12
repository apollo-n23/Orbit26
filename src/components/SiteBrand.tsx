import type { AppStage } from '../types/round'

/**
 * Site brand lockup for the top banner (logo + title), plus the site-wide
 * Home / Regulation / Customer Portal buttons. Logo lives in public/ as
 * "PMI Logo.svg". Live Lead Time / Launches / Defects metrics live in
 * `StageNav`'s Simulation Navigator banner instead, not here.
 */
interface SiteBrandProps {
  title?: string
  subtitle?: string
  activeStage: AppStage
  onNavigate: (stage: AppStage) => void
}

const LOGO_SRC = `${import.meta.env.BASE_URL}PMI%20Logo.svg`

export function SiteBrand({
  title = 'Orb-it',
  subtitle = 'Process Excellence Simulator',
  activeStage,
  onNavigate,
}: SiteBrandProps) {
  const isHome = activeStage === 'home'
  const isRegulation = activeStage === 'regulation'
  const isCustomers = activeStage === 'customers'

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <img
          src={LOGO_SRC}
          alt="PMI"
          className="top-bar__logo"
          width={140}
          height={40}
          decoding="async"
        />
        <div className="top-bar__brand-divider" aria-hidden="true" />
        <div className="top-bar__titles">
          <h1 className="top-bar__title">{title}</h1>
          {subtitle ? <p className="top-bar__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <nav className="top-bar__nav" aria-label="Site sections">
        <button
          type="button"
          className={`top-bar__home-btn${isHome ? ' top-bar__home-btn--active' : ''}`}
          aria-current={isHome ? 'page' : undefined}
          onClick={() => onNavigate('home')}
        >
          Orb-it Intranet
        </button>
        <button
          type="button"
          className={`top-bar__regulation-btn${isRegulation ? ' top-bar__regulation-btn--active' : ''}`}
          aria-current={isRegulation ? 'page' : undefined}
          onClick={() => onNavigate('regulation')}
        >
          Regulatory Hub
        </button>
        <button
          type="button"
          className={`top-bar__customer-btn${isCustomers ? ' top-bar__customer-btn--active' : ''}`}
          aria-current={isCustomers ? 'page' : undefined}
          onClick={() => onNavigate('customers')}
        >
          Customer Portal
        </button>
      </nav>
    </header>
  )
}
