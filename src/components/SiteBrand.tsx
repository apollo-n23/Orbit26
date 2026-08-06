/**
 * Site brand lockup for the top banner (logo + title).
 * Logo lives in public/ as "PMI Logo.svg".
 */
interface SiteBrandProps {
  title?: string
  subtitle?: string
}

const LOGO_SRC = `${import.meta.env.BASE_URL}PMI%20Logo.svg`

export function SiteBrand({
  title = 'Orb-it',
  subtitle = 'Process Excellence Simulator',
}: SiteBrandProps) {
  return (
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
  )
}
