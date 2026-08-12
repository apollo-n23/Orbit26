interface BoosterProps {
  className?: string
  ready?: boolean
  worked?: boolean
  label?: string
  /**
   * When false, omit the nosecone — assembly (step 1) has not fitted one yet,
   * and haul road (step 2) hasn't either, since payload integration happens
   * later at launch prep. Launch prep keeps the default (true).
   */
  showNose?: boolean
  /**
   * Engine nozzle style. Defaults to mirroring `showNose` (single expanding
   * bell when there's no nose, matching Assembly's still-being-built
   * booster) — Haul road overrides this to keep the completed booster's
   * multi-nozzle engine even though its nose isn't fitted yet.
   * With the assembly sprite, multi-nozzle art is already baked into the PNG.
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

  // Bare booster (no fairing): use the HD sprite on the production line, haul
  // crawler, and redesign preview. Launch-prep still uses CSS art with a nose.
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
