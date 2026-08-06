interface BoosterProps {
  className?: string
  ready?: boolean
  worked?: boolean
  label?: string
}

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
        <span className="booster__logo">ORB-IT</span>
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
