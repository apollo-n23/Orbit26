export function MapView() {
  return (
    <section className="view-panel" aria-labelledby="map-heading">
      <header className="view-panel__header">
        <h2 id="map-heading">Map</h2>
        <p className="view-panel__lede">
          Build and analyse the value stream. Tag the eight wastes.
        </p>
      </header>
      <div className="view-panel__body view-panel__body--empty">
        <p className="placeholder-copy">
          Process map workspace will appear here. Steps, flows, and waste tags
          land in a later increment.
        </p>
      </div>
    </section>
  )
}
