interface BoosterProps {
  className?: string
  ready?: boolean
  worked?: boolean
  label?: string
  /**
   * When false, omit the nosecone — assembly (step 1) has not fitted one yet.
   * Haul / launch prep keep the default (true).
   */
  showNose?: boolean
}

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

/** Shared CSS booster art used in manufacture, haul, and launch-prep scenes. */
export function Booster({
  className = '',
  ready = false,
  worked = false,
  label,
  showNose = true,
}: BoosterProps) {
  const isAssembly = !showNose

  return (
    <div
      className={[
        'booster',
        worked ? 'booster--worked' : '',
        ready ? 'booster--ready' : '',
        isAssembly ? 'booster--no-nose' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={label ?? 'Booster'}
    >
      {showNose ? (
        <div className="booster__nose" />
      ) : (
        /* Payload interface — fairing not fitted; metallic mate face + seam. */
        <div className="booster__payload-mount" aria-hidden="true">
          <span className="booster__payload-face" />
          <span className="booster__payload-seam" />
          <span className="booster__payload-bolt booster__payload-bolt--1" />
          <span className="booster__payload-bolt booster__payload-bolt--2" />
          <span className="booster__payload-bolt booster__payload-bolt--3" />
          <span className="booster__payload-bolt booster__payload-bolt--4" />
          <span className="booster__payload-ring" />
        </div>
      )}

      <div className="booster__body">
        <span className="booster__band" />
        <span className="booster__band" />
        <img
          src={ORBIT_LOGO_SRC}
          alt=""
          className="booster__logo"
          draggable={false}
        />
      </div>

      {isAssembly ? (
        /* Single expanding bell nozzle (assembly / redesign preview). */
        <div className="booster__engine booster__engine--bell" aria-hidden="true">
          <span className="booster__nozzle-throat" />
          <span className="booster__nozzle-bell" />
          <span className="booster__nozzle-lip" />
        </div>
      ) : (
        <div className="booster__engine">
          <span className="booster__nozzle" />
          <span className="booster__nozzle" />
          <span className="booster__nozzle" />
        </div>
      )}

      {ready && <span className="booster__ready-tag">Ready</span>}
    </div>
  )
}
