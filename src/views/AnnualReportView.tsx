import type { CSSProperties } from 'react'
import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`
/** Cache-bust when the public file is replaced in-place (same filename). */
const ORBIT_BOOST_SRC = `${import.meta.env.BASE_URL}OrbitBoost.jpg?v=3`

interface AnnualReportViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

const SALES_DATA: { year: string; revenueM: number }[] = [
  { year: 'FY21', revenueM: 412 },
  { year: 'FY22', revenueM: 398 },
  { year: 'FY23', revenueM: 371 },
  { year: 'FY24', revenueM: 335 },
  { year: 'FY25', revenueM: 298 },
]

const CHART_WIDTH = 560
const CHART_HEIGHT = 260
const CHART_MARGIN = { top: 20, right: 16, bottom: 36, left: 52 }
const CHART_Y_MIN = 250
const CHART_Y_MAX = 430
const CHART_GRID_VALUES = [250, 300, 350, 400]

/** Net revenue, FY21–FY25 — a slow, steady decline, not a cliff. */
function SalesDeclineChart() {
  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom
  const baselineY = CHART_MARGIN.top + plotHeight

  const xFor = (i: number) =>
    CHART_MARGIN.left + (plotWidth * i) / (SALES_DATA.length - 1)
  const yFor = (revenueM: number) =>
    CHART_MARGIN.top +
    plotHeight * (1 - (revenueM - CHART_Y_MIN) / (CHART_Y_MAX - CHART_Y_MIN))

  const points = SALES_DATA.map((d, i) => ({
    ...d,
    x: xFor(i),
    y: yFor(d.revenueM),
  }))
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${points[0].x},${baselineY} ${linePoints} ${
    points[points.length - 1].x
  },${baselineY}`

  const first = SALES_DATA[0].revenueM
  const last = SALES_DATA[SALES_DATA.length - 1].revenueM
  const declinePct = Math.round(((first - last) / first) * 100)

  return (
    <figure className="annual-report-chart">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`Net revenue, FY21 through FY25, declining from $${first}M to $${last}M — a ${declinePct}% drop`}
      >
        <defs>
          <linearGradient id="sales-decline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-brand-orange)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="var(--color-brand-orange)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {CHART_GRID_VALUES.map((v) => (
          <g key={v}>
            <line
              x1={CHART_MARGIN.left}
              x2={CHART_WIDTH - CHART_MARGIN.right}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={CHART_MARGIN.left - 8}
              y={yFor(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--color-text-muted)"
            >
              ${v}M
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#sales-decline-fill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--color-brand-orange)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p) => (
          <g key={p.year}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--color-brand-orange)"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={CHART_HEIGHT - CHART_MARGIN.bottom + 18}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-muted)"
            >
              {p.year}
            </text>
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="var(--color-text)"
            >
              ${p.revenueM}M
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="annual-report-chart__caption">
        Net revenue has declined {declinePct}% since FY21 — from ${first}M to
        ${last}M.
      </figcaption>
    </figure>
  )
}

/**
 * Annual Report destination reached from Home — static in-fiction content
 * describing Orb-it's challenges and calling for an improvement project.
 * No state of its own — mounted only while stage === 'annual-report'.
 */
export function AnnualReportView({
  activeStage,
  onNavigateStage,
}: AnnualReportViewProps) {
  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Annual Report" />
      </header>
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section
          className="view-panel annual-report"
          aria-labelledby="annual-report-heading"
          style={
            {
              backgroundImage: [
                'linear-gradient(165deg, rgba(7, 11, 18, 0.42) 0%, rgba(7, 11, 18, 0.18) 45%, rgba(7, 11, 18, 0.5) 100%)',
                `url("${ORBIT_BOOST_SRC}")`,
              ].join(', '),
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%',
              backgroundRepeat: 'no-repeat',
            } satisfies CSSProperties
          }
        >
          <header className="view-panel__header annual-report__masthead annual-report__pane">
            <span className="annual-report__logo-badge annual-report__logo-badge--masthead">
              <img
                src={ORBIT_LOGO_SRC}
                alt="Orb-it"
                className="annual-report__masthead-logo"
                width={56}
                height={56}
                decoding="async"
              />
            </span>
            <div>
              <p className="annual-report__eyebrow">FY2025 Annual Report</p>
              <h2 id="annual-report-heading">Orb-it Satellite Constellation</h2>
              <p className="view-panel__lede">
                A message to shareholders and staff on where we stand, and
                what must change.
              </p>
            </div>
          </header>

          <div className="view-panel__body annual-report__body">
            <section className="annual-report__section annual-report__pane">
              <h3>Who we are</h3>
              <p>
                Orb-it designs, integrates, and launches the boosters that
                place our customers' satellites into orbit. Our value stream
                runs from Assembly, through Haul to the launch pad, into
                Launch Preparation, and finally Launch Sequence — every
                booster we fly touches all four. Over the past five years
                we've grown a loyal base of telecoms, defence, and research
                customers who depend on us for a precise, repeatable service:
                every satellite delivered to its target altitude, on a
                predictable cadence.
              </p>
              <p>
                That reputation is now at risk.
              </p>
            </section>

            <section className="annual-report__section annual-report__pane">
              <h3>Net revenue, FY21–FY25</h3>
              <SalesDeclineChart />
            </section>

            <section className="annual-report__section annual-report__pane">
              <h3>The challenges ahead</h3>
              <div className="annual-report__challenges">
                <div className="annual-report__challenge-card">
                  <h4>Customer feedback</h4>
                  <p>
                    Our customers tell us directly — on Starfeed and
                    elsewhere — that launch cadence is unpredictable, altitude
                    delivery is inconsistent against the 75-mile target they
                    were promised, and haul-road incidents have damaged
                    hardware in transit. Confidence is eroding faster than we
                    can rebuild it launch by launch.
                  </p>
                </div>
                <div className="annual-report__challenge-card">
                  <h4>Long lead times</h4>
                  <p>
                    End-to-end lead time — from a booster entering Assembly to
                    liftoff — has crept upward year over year. Every extra
                    hour in the value stream is an hour a customer's payload
                    isn't in orbit, and a competitive opening for challengers
                    who can move faster.
                  </p>
                </div>
                <div className="annual-report__challenge-card">
                  <h4>Spiralling costs</h4>
                  <p>
                    Rework, damaged hardware, and ad-hoc fixes to keep
                    launches moving have pushed operating costs up even as
                    revenue falls — a combination that cannot continue
                    indefinitely without real structural change to how we
                    work.
                  </p>
                </div>
              </div>
            </section>

            <section className="annual-report__call-to-arms annual-report__pane">
              <h3>A call to arms</h3>
              <p>
                The Executive Leadership Team is chartering a company-wide
                Process Excellence Initiative. We are calling for volunteers
                from Assembly, Integration, and Launch Preparation to join a
                cross-functional improvement team — starting with a Gemba
                walk of today's process, a baseline assessment of current
                performance, and a redesign that measurably reduces lead
                time, cost, and defects. This is not a side project. It is
                how Orb-it earns back its customers' trust.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onNavigateStage('gemba')}
              >
                Join the improvement project
              </button>
            </section>

            <footer className="annual-report__footer annual-report__pane">
              <span className="annual-report__logo-badge annual-report__logo-badge--footer">
                <img
                  src={ORBIT_LOGO_SRC}
                  alt="Orb-it"
                  width={28}
                  height={28}
                  decoding="async"
                />
              </span>
              <span>Orb-it Executive Leadership Team</span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}
