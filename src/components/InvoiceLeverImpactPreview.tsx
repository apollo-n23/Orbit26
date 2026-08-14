import type { ReactNode } from 'react'
import type { HistoricLaunch, InvoiceDraft, InvoiceLeverId } from '../types/invoice'
import { HISTORIC_LAUNCHES } from '../data/historicLaunches'
import {
  FIELD_META,
  formatSlipFieldValue,
  SCRAMBLED_FIELD_ORDER,
  SET_IN_ORDER_FIELD_ORDER,
  SOURCE_SLIP_FIELD_ORDER,
} from '../data/invoiceForm'
import { INVOICE_LEVERS } from '../data/invoiceLevers'

const SAMPLE = HISTORIC_LAUNCHES[0]
const SHINE_SAMPLES = HISTORIC_LAUNCHES.slice(0, 3)

const IMPACT_LABELS: Record<
  InvoiceLeverId,
  { before: string; after: string }
> = {
  sort: { before: 'As-is record', after: 'After Sort' },
  'set-in-order': { before: 'As-is form', after: 'After Set in Order' },
  shine: { before: 'As-is list', after: 'After Shine' },
  standardize: { before: 'As-is fields', after: 'After Standardize' },
  sustain: {
    before: 'Later, without Sustain',
    after: 'Later, with Sustain',
  },
}

function assetUrl(file: string) {
  return `${import.meta.env.BASE_URL}${file}`
}

export function InvoiceLeverImpactPreview({
  leverId,
}: {
  leverId: InvoiceLeverId | null
}) {
  const lever = leverId
    ? (INVOICE_LEVERS.find((item) => item.id === leverId) ?? null)
    : null

  return (
    <aside
      className={[
        'invoice-lever-impact',
        lever ? 'invoice-lever-impact--live' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
      aria-label={
        lever
          ? `${lever.title} impact preview`
          : 'Invoice process impact preview'
      }
    >
      {lever ? (
        <>
          <header className="invoice-lever-impact__header">
            <span className="invoice-lever-impact__term">{lever.term}</span>
            <h3 className="invoice-lever-impact__title">{lever.title}</h3>
          </header>
          <div className="invoice-lever-impact__stage">
            <img
              className="invoice-lever-impact__scene"
              src={assetUrl(lever.preview)}
              alt=""
              draggable={false}
            />
            <ImpactCompare leverId={lever.id} />
          </div>
        </>
      ) : (
        <div className="invoice-lever-impact__idle">
          <header className="invoice-lever-impact__header">
            <span className="invoice-lever-impact__term">As-is</span>
            <h3 className="invoice-lever-impact__title">Invoice process</h3>
          </header>
          <div className="invoice-impact-idle-visual">
            <MiniLaunchCard launch={SAMPLE} note={SAMPLE.internalNote} />
            <MiniInvoiceForm
              fieldOrder={SCRAMBLED_FIELD_ORDER}
              scrambled
              placeholders={false}
            />
          </div>
          <p className="invoice-lever-impact__hint">
            <span className="invoice-hover-copy">
              Hover a 5S card to preview how it changes this process.
            </span>
            <span className="invoice-touch-copy">
              Tap a 5S card to preview how it changes this process.
            </span>
          </p>
        </div>
      )}
    </aside>
  )
}

function ImpactCompare({ leverId }: { leverId: InvoiceLeverId }) {
  const labels = IMPACT_LABELS[leverId]
  return (
    <div className="invoice-impact-compare">
      <ImpactCol label={labels.before}>{renderBefore(leverId)}</ImpactCol>
      <ImpactArrow />
      <ImpactCol label={labels.after} improved>
        {renderAfter(leverId)}
      </ImpactCol>
    </div>
  )
}

function renderBefore(leverId: InvoiceLeverId) {
  switch (leverId) {
    case 'sort':
      return (
        <>
          <MiniLaunchCard launch={SAMPLE} note={SAMPLE.internalNote} />
          <MiniSourceNote text={SAMPLE.internalNote} />
        </>
      )
    case 'set-in-order':
      return (
        <>
          <MiniSourceSlip launch={SAMPLE} />
          <MiniInvoiceForm
            fieldOrder={SCRAMBLED_FIELD_ORDER}
            scrambled
            placeholders={false}
          />
        </>
      )
    case 'shine':
      return <MiniLaunchList shine={false} />
    case 'standardize':
      // Isolate the placeholder change — order stays on the slip sequence.
      return (
        <MiniInvoiceForm
          fieldOrder={SOURCE_SLIP_FIELD_ORDER}
          placeholders={false}
        />
      )
    case 'sustain':
      return (
        <div className="invoice-impact-decay">
          <MiniLaunchList shine={false} notes />
          <MiniInvoiceForm
            fieldOrder={SCRAMBLED_FIELD_ORDER}
            scrambled
            placeholders={false}
          />
        </div>
      )
  }
}

function renderAfter(leverId: InvoiceLeverId) {
  switch (leverId) {
    case 'sort':
      return (
        <>
          <MiniLaunchCard launch={SAMPLE} />
          <DiscardedNote text={SAMPLE.internalNote} />
        </>
      )
    case 'set-in-order':
      return (
        <>
          <MiniSourceSlip launch={SAMPLE} />
          <MiniInvoiceForm
            fieldOrder={SET_IN_ORDER_FIELD_ORDER}
            placeholders={false}
            numbered
          />
        </>
      )
    case 'shine':
      return <MiniLaunchList shine />
    case 'standardize':
      return (
        <MiniInvoiceForm
          fieldOrder={SOURCE_SLIP_FIELD_ORDER}
          placeholders
        />
      )
    case 'sustain':
      return (
        <div className="invoice-impact-held">
          <span className="invoice-impact-lock" aria-hidden="true">
            <LockIcon />
          </span>
          <MiniLaunchList shine />
          <MiniInvoiceForm
            fieldOrder={SET_IN_ORDER_FIELD_ORDER}
            placeholders
            numbered
          />
        </div>
      )
  }
}

function ImpactCol({
  label,
  improved,
  children,
}: {
  label: string
  improved?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={[
        'invoice-impact-col',
        improved ? 'invoice-impact-col--improved' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="invoice-impact-col__label">{label}</p>
      <div className="invoice-impact-col__body">{children}</div>
    </div>
  )
}

function ImpactArrow() {
  return (
    <div className="invoice-impact-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M4 12h13M13 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function MiniLaunchList({
  shine,
  notes,
}: {
  shine: boolean
  notes?: boolean
}) {
  return (
    <div
      className={[
        'invoice-mini-list',
        shine ? 'invoice-mini-list--shine' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {SHINE_SAMPLES.map((launch) => (
        <MiniLaunchCard
          key={launch.id}
          launch={launch}
          note={notes ? launch.internalNote : undefined}
          compact
        />
      ))}
    </div>
  )
}

function MiniLaunchCard({
  launch,
  note,
  compact,
}: {
  launch: HistoricLaunch
  note?: string
  compact?: boolean
}) {
  return (
    <div
      className={[
        'invoice-mini-card',
        compact ? 'invoice-mini-card--compact' : '',
        note ? 'invoice-mini-card--cluttered' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="invoice-mini-card__main">
        <p className="invoice-mini-card__mission">{launch.missionName}</p>
        <p className="invoice-mini-card__meta">
          {launch.customerCompany} · {launch.launchDate}
        </p>
        {!compact && (
          <p className="invoice-mini-card__meta">
            Ref {launch.reference} · ${launch.amountDueUsd.toLocaleString()} due
          </p>
        )}
        {note && <p className="invoice-mini-card__note">Note: {note}</p>}
      </div>
      {!compact && (
        <span className="invoice-mini-btn" aria-hidden="true">
          Create invoice
        </span>
      )}
    </div>
  )
}

function MiniSourceSlip({
  launch,
  showNote,
}: {
  launch: HistoricLaunch
  showNote?: boolean
}) {
  return (
    <div className="invoice-mini-slip">
      <p className="invoice-mini-slip__title">Launch record</p>
      {SOURCE_SLIP_FIELD_ORDER.map((key) => (
        <div className="invoice-mini-slip__row" key={key}>
          <span className="invoice-mini-slip__label">
            {FIELD_META[key].label}
          </span>
          <span className="invoice-mini-slip__value">
            {formatSlipFieldValue(launch, key)}
          </span>
        </div>
      ))}
      {showNote && (
        <p className="invoice-mini-card__note">Note: {launch.internalNote}</p>
      )}
    </div>
  )
}

function MiniSourceNote({ text }: { text: string }) {
  return (
    <p className="invoice-mini-source-note">
      <span className="invoice-mini-source-note__tag">Clutter</span>
      Note: {text}
    </p>
  )
}

function DiscardedNote({ text }: { text: string }) {
  return (
    <p className="invoice-mini-discard">
      <span className="invoice-mini-discard__icon" aria-hidden="true">
        <TrashIcon />
      </span>
      <span className="invoice-mini-discard__text">Note: {text}</span>
    </p>
  )
}

function MiniInvoiceForm({
  fieldOrder,
  placeholders,
  scrambled,
  numbered,
}: {
  fieldOrder: (keyof InvoiceDraft)[]
  placeholders: boolean
  scrambled?: boolean
  numbered?: boolean
}) {
  return (
    <div
      className={[
        'invoice-mini-form',
        scrambled ? 'invoice-mini-form--scrambled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {fieldOrder.map((key, index) => (
        <div className="invoice-mini-field" key={key}>
          {numbered && (
            <span className="invoice-mini-field__seq">{index + 1}</span>
          )}
          <span className="invoice-mini-field__label">
            {FIELD_META[key].label}
          </span>
          <span
            className={[
              'invoice-mini-field__box',
              placeholders ? 'invoice-mini-field__box--hint' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {placeholders ? FIELD_META[key].example : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
