import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

interface CreateInvoicesViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

/**
 * Invoicing destination reached from Home. Placeholder only — to be
 * redesigned later. No state of its own — mounted only while
 * stage === 'invoices'.
 */
export function CreateInvoicesView({
  activeStage,
  onNavigateStage,
}: CreateInvoicesViewProps) {
  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Create Invoices" />
      </header>
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section className="view-panel" aria-labelledby="invoices-heading">
          <header className="view-panel__header">
            <h2 id="invoices-heading">Create Invoices</h2>
            <p className="view-panel__lede">
              Billing for completed launches — coming soon.
            </p>
          </header>

          <div className="view-panel__body view-panel__body--empty">
            <p className="placeholder-copy">
              This screen is a placeholder. Invoice creation will be designed
              here.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
