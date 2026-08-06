export function ComparisonView() {
  return (
    <section className="view-panel" aria-labelledby="comparison-heading">
      <header className="view-panel__header">
        <h2 id="comparison-heading">Comparison</h2>
        <p className="view-panel__lede">
          Validate redesigns against baseline metrics and unlock options.
        </p>
      </header>
      <div className="view-panel__body view-panel__body--empty">
        <p className="placeholder-copy">
          Baseline vs redesigned metrics will be compared here after validation runs.
        </p>
      </div>
    </section>
  )
}
