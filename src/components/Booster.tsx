interface BoosterProps {
  className?: string
  ready?: boolean
  worked?: boolean
  label?: string
}

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

/** Shared CSS booster art used in manufacture and haul scenes. */
export function Booster({
  className = '',
  ready = false,
  worked = false,
  label,
}: BoosterProps) {
  return (
    <div
      className={[
        'booster',
        worked ? 'booster--worked' : '',
        ready ? 'booster--ready' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={label ?? 'Booster'}
    >
      <div className="booster__nose" />
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
      <div className="booster__engine">
        <span className="booster__nozzle" />
        <span className="booster__nozzle" />
        <span className="booster__nozzle" />
      </div>
      {ready && <span className="booster__ready-tag">Ready</span>}
    </div>
  )
}
