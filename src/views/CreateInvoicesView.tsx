import { useMemo, useState } from 'react'
import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'
import {
  BLANK_INVOICE_DRAFT,
  type HistoricLaunch,
  type InvoiceDraft,
  type InvoiceLeverId,
  type SentInvoice,
} from '../types/invoice'
import { HISTORIC_LAUNCHES } from '../data/historicLaunches'
import { INVOICE_LEVERS } from '../data/invoiceLevers'

type InvoiceSubView = 'process' | 'redesign'
type DraftStage = 'editing' | 'review'

/** Baseline field order — deliberately not the order billing actually happens in. */
const SCRAMBLED_FIELD_ORDER: (keyof InvoiceDraft)[] = [
  'amountDueUsd',
  'missionName',
  'reference',
  'customerCompany',
  'launchDate',
  'customerName',
]
/** "Set in Order" field order — reference, who, what, when, how much. */
const SET_IN_ORDER_FIELD_ORDER: (keyof InvoiceDraft)[] = [
  'reference',
  'customerName',
  'customerCompany',
  'missionName',
  'launchDate',
  'amountDueUsd',
]

const FIELD_META: Record<keyof InvoiceDraft, { label: string; example: string }> = {
  customerName: { label: 'Customer contact name', example: 'e.g. Priya Anand' },
  customerCompany: { label: 'Customer company', example: 'e.g. NimbusLink' },
  missionName: { label: 'Mission name', example: 'e.g. NimbusLink Relay-7' },
  launchDate: { label: 'Launch date', example: 'e.g. 2026-01-12' },
  reference: { label: 'Invoice reference', example: 'e.g. ORB-1042' },
  amountDueUsd: { label: 'Amount due (USD)', example: 'e.g. 186400' },
}

interface CreateInvoicesViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

/**
 * Invoicing destination reached from Home — a standalone 5S teaching module.
 * No `ProcessVersion`, no redesign budget, no link to the rocket launch
 * process or the Data board. Mounted only while stage === 'invoices', so
 * (like Gemba/Customer Portal/Regulation) progress here resets on hop-away —
 * a deliberate v1 simplification, not an oversight.
 */
export function CreateInvoicesView({
  activeStage,
  onNavigateStage,
}: CreateInvoicesViewProps) {
  const [subView, setSubView] = useState<InvoiceSubView>('process')
  const [enabledLevers, setEnabledLevers] = useState<Set<InvoiceLeverId>>(
    () => new Set(),
  )
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null)
  const [draftStage, setDraftStage] = useState<DraftStage>('editing')
  const [draft, setDraft] = useState<InvoiceDraft>(BLANK_INVOICE_DRAFT)
  const [formError, setFormError] = useState<string | null>(null)
  const [sentInvoices, setSentInvoices] = useState<Record<string, SentInvoice>>(
    {},
  )

  const sortEnabled = enabledLevers.has('sort')
  const setInOrderEnabled = enabledLevers.has('set-in-order')
  const shineEnabled = enabledLevers.has('shine')
  const standardizeEnabled = enabledLevers.has('standardize')

  const selectedLaunch = useMemo(
    () => HISTORIC_LAUNCHES.find((l) => l.id === selectedLaunchId) ?? null,
    [selectedLaunchId],
  )

  function toggleLever(id: InvoiceLeverId) {
    setEnabledLevers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectLaunch(launch: HistoricLaunch) {
    setSelectedLaunchId(launch.id)
    setDraft(BLANK_INVOICE_DRAFT)
    setDraftStage('editing')
    setFormError(null)
  }

  function handleDraftChange(key: keyof InvoiceDraft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleCancelDraft() {
    setSelectedLaunchId(null)
    setDraft(BLANK_INVOICE_DRAFT)
    setDraftStage('editing')
    setFormError(null)
  }

  function handleCreateInvoice() {
    if (
      !draft.customerName.trim() ||
      !draft.customerCompany.trim() ||
      !draft.missionName.trim() ||
      !draft.launchDate.trim() ||
      !draft.reference.trim()
    ) {
      setFormError('Fill in every field before creating the invoice.')
      return
    }
    const amount = Number(draft.amountDueUsd)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount due must be a positive number.')
      return
    }
    setFormError(null)
    setDraftStage('review')
  }

  function handleSendInvoice() {
    if (!selectedLaunch) return
    setSentInvoices((prev) => ({
      ...prev,
      [selectedLaunch.id]: {
        launchId: selectedLaunch.id,
        sentAt: Date.now(),
        draft,
      },
    }))
    setSelectedLaunchId(null)
    setDraft(BLANK_INVOICE_DRAFT)
    setDraftStage('editing')
  }

  const fieldOrder = setInOrderEnabled
    ? SET_IN_ORDER_FIELD_ORDER
    : SCRAMBLED_FIELD_ORDER
  const sentCount = Object.keys(sentInvoices).length

  return (
    <div className="app-shell">
      <SiteBrand
        subtitle="Create Invoices"
        activeStage={activeStage}
        onNavigate={onNavigateStage}
      />
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section className="view-panel" aria-labelledby="invoices-heading">
          <header className="view-panel__header">
            <div>
              <h2 id="invoices-heading">Create Invoices</h2>
              <p className="view-panel__lede">
                Billing for completed launches — a standalone exercise in
                applying <strong>5S</strong> to an office process. It has no
                effect on the rocket launch process, its Data board, or the
                To-be redesign budget.
              </p>
            </div>
          </header>

          <div className="view-panel__body redesign-body">
            <nav className="view-nav" aria-label="Invoice process views">
              <button
                type="button"
                className={`view-nav__item${subView === 'process' ? ' view-nav__item--active' : ''}`}
                aria-current={subView === 'process' ? 'page' : undefined}
                onClick={() => setSubView('process')}
              >
                Process
              </button>
              <button
                type="button"
                className={`view-nav__item${subView === 'redesign' ? ' view-nav__item--active' : ''}`}
                aria-current={subView === 'redesign' ? 'page' : undefined}
                onClick={() => setSubView('redesign')}
              >
                Redesign
              </button>
            </nav>

            {subView === 'redesign' ? (
              <InvoiceRedesignPanel
                enabledLevers={enabledLevers}
                onToggleLever={toggleLever}
              />
            ) : (
              <>
                <p className="invoice-progress" aria-live="polite">
                  Invoices sent: {sentCount}/{HISTORIC_LAUNCHES.length}
                </p>

                {selectedLaunch ? (
                  <InvoiceDraftPanel
                    launch={selectedLaunch}
                    draft={draft}
                    draftStage={draftStage}
                    fieldOrder={fieldOrder}
                    standardizeEnabled={standardizeEnabled}
                    sortEnabled={sortEnabled}
                    formError={formError}
                    onChange={handleDraftChange}
                    onCreate={handleCreateInvoice}
                    onSend={handleSendInvoice}
                    onBackToEdit={() => setDraftStage('editing')}
                    onCancel={handleCancelDraft}
                  />
                ) : (
                  <HistoricLaunchList
                    launches={HISTORIC_LAUNCHES}
                    sentInvoices={sentInvoices}
                    sortEnabled={sortEnabled}
                    shineEnabled={shineEnabled}
                    onSelect={handleSelectLaunch}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function HistoricLaunchList({
  launches,
  sentInvoices,
  sortEnabled,
  shineEnabled,
  onSelect,
}: {
  launches: HistoricLaunch[]
  sentInvoices: Record<string, SentInvoice>
  sortEnabled: boolean
  shineEnabled: boolean
  onSelect: (launch: HistoricLaunch) => void
}) {
  return (
    <div
      className={[
        'invoice-launch-list',
        shineEnabled ? 'invoice-launch-list--shine' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {launches.map((launch) => {
        const sent = sentInvoices[launch.id]
        return (
          <div className="invoice-launch-card" key={launch.id}>
            <div className="invoice-launch-card__main">
              <p className="invoice-launch-card__mission">
                {launch.missionName}
              </p>
              <p className="invoice-launch-card__meta">
                {launch.customerCompany} · {launch.launchDate} ·{' '}
                {launch.heightAchievedMiles} mi
              </p>
              <p className="invoice-launch-card__meta">
                Ref {launch.reference} · $
                {launch.amountDueUsd.toLocaleString()} due
              </p>
              {!sortEnabled && (
                <p className="invoice-launch-card__note">
                  Note: {launch.internalNote}
                </p>
              )}
            </div>
            <div className="invoice-launch-card__action">
              {sent ? (
                <span className="invoice-status-pill invoice-status-pill--sent">
                  ✓ Invoiced
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => onSelect(launch)}
                >
                  Create invoice
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InvoiceDraftPanel({
  launch,
  draft,
  draftStage,
  fieldOrder,
  standardizeEnabled,
  sortEnabled,
  formError,
  onChange,
  onCreate,
  onSend,
  onBackToEdit,
  onCancel,
}: {
  launch: HistoricLaunch
  draft: InvoiceDraft
  draftStage: DraftStage
  fieldOrder: (keyof InvoiceDraft)[]
  standardizeEnabled: boolean
  sortEnabled: boolean
  formError: string | null
  onChange: (key: keyof InvoiceDraft, value: string) => void
  onCreate: () => void
  onSend: () => void
  onBackToEdit: () => void
  onCancel: () => void
}) {
  return (
    <div className="invoice-draft">
      <div className="invoice-draft__source">
        <p className="invoice-draft__source-title">
          Launch record — read from here
        </p>
        <dl className="invoice-draft__source-fields">
          <div>
            <dt>Mission</dt>
            <dd>{launch.missionName}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{launch.customerName}</dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>{launch.customerCompany}</dd>
          </div>
          <div>
            <dt>Launch date</dt>
            <dd>{launch.launchDate}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{launch.reference}</dd>
          </div>
          <div>
            <dt>Amount due</dt>
            <dd>${launch.amountDueUsd.toLocaleString()}</dd>
          </div>
        </dl>
        {!sortEnabled && (
          <p className="invoice-draft__source-note">
            Note: {launch.internalNote}
          </p>
        )}
      </div>

      {draftStage === 'editing' ? (
        <div className="invoice-draft__form">
          <p className="invoice-draft__form-title">
            Enter the invoice details
          </p>
          {fieldOrder.map((key) => (
            <label className="invoice-field" key={key}>
              <span className="invoice-field__label">
                {FIELD_META[key].label}
              </span>
              <input
                type="text"
                className="invoice-field__input"
                value={draft[key]}
                placeholder={
                  standardizeEnabled ? FIELD_META[key].example : undefined
                }
                onChange={(e) => onChange(key, e.target.value)}
              />
            </label>
          ))}
          {formError && (
            <p className="invoice-form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="invoice-draft__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onCreate}
            >
              Create invoice
            </button>
          </div>
        </div>
      ) : (
        <div className="invoice-draft__review">
          <p className="invoice-draft__form-title">Review before sending</p>
          <dl className="invoice-draft__source-fields">
            <div>
              <dt>Reference</dt>
              <dd>{draft.reference}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{draft.customerName}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{draft.customerCompany}</dd>
            </div>
            <div>
              <dt>Mission</dt>
              <dd>{draft.missionName}</dd>
            </div>
            <div>
              <dt>Launch date</dt>
              <dd>{draft.launchDate}</dd>
            </div>
            <div>
              <dt>Amount due</dt>
              <dd>${draft.amountDueUsd}</dd>
            </div>
          </dl>
          <div className="invoice-draft__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onBackToEdit}
            >
              Back to edit
            </button>
            <button type="button" className="btn btn--primary" onClick={onSend}>
              Send invoice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceRedesignPanel({
  enabledLevers,
  onToggleLever,
}: {
  enabledLevers: Set<InvoiceLeverId>
  onToggleLever: (id: InvoiceLeverId) => void
}) {
  return (
    <div className="invoice-redesign">
      <p className="invoice-redesign__note">
        <strong>No cost, no budget.</strong> These 5S improvements are
        separate from the rocket launch redesign and its change budget —
        toggle any combination on to see how they change the Process tab.
      </p>
      <div className="invoice-lever-grid">
        {INVOICE_LEVERS.map((lever) => {
          const selected = enabledLevers.has(lever.id)
          return (
            <button
              key={lever.id}
              type="button"
              className={[
                'invoice-lever-card',
                selected ? 'invoice-lever-card--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onToggleLever(lever.id)}
              aria-pressed={selected}
            >
              <span className="invoice-lever-card__term">{lever.term}</span>
              <span className="invoice-lever-card__title">{lever.title}</span>
              <span className="invoice-lever-card__desc">
                {lever.description}
              </span>
              <span className="invoice-lever-card__status">
                {selected ? 'On' : 'Off'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
