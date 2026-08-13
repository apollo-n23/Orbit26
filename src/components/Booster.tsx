interface BoosterProps {
  className?: string
  ready?: boolean
  worked?: boolean
  label?: string
  /**
   * When false, render the bare AssemblyBooster.png sprite (no CSS nosecone).
   * Used by manufacture, haul, and launch-prep — payload/fairing at prep is a
   * separate `.lp-payload` overlay, not Booster's CSS nose.
   */
  showNose?: boolean
  /**
   * Engine nozzle style for the CSS-art path only (`showNose` true). Defaults
   * to mirroring `showNose`. With the assembly sprite, multi-nozzle art is
   * already baked into the PNG.
   */
  multiNozzleEngine?: boolean
}

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`
/**
 * Horizontal white bare-booster sprite (payload mount left, engines right).
 * True transparent PNG; cache-bust when the asset is replaced.
 */
const ASSEMBLY_BOOSTER_SRC = `${import.meta.env.BASE_URL}AssemblyBooster.png?v=4`

/** Shared booster art used in manufacture, haul, and launch-prep scenes. */
export function Booster({
  className = '',
  ready = false,
  worked = false,
  label,
  showNose = true,
  multiNozzleEngine = showNose,
}: BoosterProps) {
  const isAssembly = !showNose
  const singleBellEngine = !multiNozzleEngine

  // Bare booster (no fairing): HD sprite on manufacture, haul, redesign
  // preview, and launch-prep (fairing is a separate stack overlay there).
  if (isAssembly) {
    return (
      <div
        className={[
          'booster',
          'booster--sprite',
          'booster--no-nose',
          worked ? 'booster--worked' : '',
          ready ? 'booster--ready' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="img"
        aria-label={label ?? 'Booster'}
      >
        <img
          src={ASSEMBLY_BOOSTER_SRC}
          alt=""
          className="booster__sprite"
          draggable={false}
          decoding="async"
        />
        {ready && <span className="booster__ready-tag">Ready</span>}
      </div>
    )
  }

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

      {singleBellEngine ? (
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
