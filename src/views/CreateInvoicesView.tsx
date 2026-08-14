import { useMemo, useState } from 'react'
import { InvoiceLeverImpactPreview } from '../components/InvoiceLeverImpactPreview'
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
import {
  FIELD_META,
  formatSlipFieldValue,
  parseAmountDueUsd,
  SCRAMBLED_FIELD_ORDER,
  SET_IN_ORDER_FIELD_ORDER,
  SOURCE_SLIP_FIELD_ORDER,
} from '../data/invoiceForm'
import { HISTORIC_LAUNCHES } from '../data/historicLaunches'
import { INVOICE_LEVERS } from '../data/invoiceLevers'

type InvoiceSubView = 'process' | 'redesign'
type DraftStage = 'editing' | 'review'

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
      if (id === 'sustain') {
        if (next.has('sustain')) {
          next.delete('sustain')
        } else {
          // Sustain = keep the full 5S system in place.
          next.add('sustain')
          next.add('sort')
          next.add('set-in-order')
          next.add('shine')
          next.add('standardize')
        }
        return next
      }

      if (next.has(id)) next.delete(id)
      else next.add(id)

      // Dropping any of the other four breaks Sustain.
      if (!next.has(id) && next.has('sustain')) {
        next.delete('sustain')
      }
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
    const amount = parseAmountDueUsd(draft.amountDueUsd)
    if (amount === null) {
      setFormError(
        'Amount due must be a positive number (e.g. 186400 or $186,400).',
      )
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
          {SOURCE_SLIP_FIELD_ORDER.map((key) => (
            <div key={key}>
              <dt>{FIELD_META[key].label}</dt>
              <dd>{formatSlipFieldValue(launch, key)}</dd>
            </div>
          ))}
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
            {SOURCE_SLIP_FIELD_ORDER.map((key) => (
              <div key={key}>
                <dt>{FIELD_META[key].label}</dt>
                <dd>
                  {key === 'amountDueUsd'
                    ? (() => {
                        const parsed = parseAmountDueUsd(draft.amountDueUsd)
                        return parsed === null
                          ? draft.amountDueUsd
                          : `$${parsed.toLocaleString()}`
                      })()
                    : draft[key]}
                </dd>
              </div>
            ))}
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
  const [previewedLever, setPreviewedLever] = useState<InvoiceLeverId | null>(
    null,
  )

  return (
    <div className="invoice-redesign">
      <p className="invoice-redesign__note">
        <strong>No cost, no budget.</strong> These 5S improvements are
        separate from the rocket launch redesign and its change budget.
        Hover a card to preview its effect on the invoice process; toggle
        it on to apply the change on the Process tab.
      </p>
      <div
        className="invoice-redesign__workspace"
        onMouseLeave={() => setPreviewedLever(null)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setPreviewedLever(null)
          }
        }}
      >
        <div className="invoice-lever-grid">
          {INVOICE_LEVERS.map((lever) => {
            const selected = enabledLevers.has(lever.id)
            const previewing = previewedLever === lever.id
            return (
              <button
                key={lever.id}
                type="button"
                data-lever-id={lever.id}
                className={[
                  'invoice-lever-card',
                  selected ? 'invoice-lever-card--selected' : '',
                  previewing ? 'invoice-lever-card--previewing' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onToggleLever(lever.id)}
                onMouseEnter={() => setPreviewedLever(lever.id)}
                onFocus={() => setPreviewedLever(lever.id)}
                aria-pressed={selected}
              >
                <img
                  className="invoice-lever-card__hero"
                  src={`${import.meta.env.BASE_URL}${lever.icon}`}
                  alt=""
                  draggable={false}
                />
                <span className="invoice-lever-card__body">
                  <span className="invoice-lever-card__term">{lever.term}</span>
                  <span className="invoice-lever-card__title">
                    {lever.title}
                  </span>
                  <span className="invoice-lever-card__desc">
                    {lever.description}
                  </span>
                  <span className="invoice-lever-card__footer">
                    <span className="invoice-lever-card__hint">
                      <span className="invoice-hover-copy">Hover to preview</span>
                      <span className="invoice-touch-copy">Tap to preview</span>
                    </span>
                    <span className="invoice-lever-card__status">
                      {selected ? 'On' : 'Off'}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <InvoiceLeverImpactPreview leverId={previewedLever} />
      </div>
    </div>
  )
}
