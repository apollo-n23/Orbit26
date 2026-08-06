import { formatLeadTime } from '../lib/simulation'
import { leadTimeImprovementMs } from '../lib/roundMetrics'

interface RoundLeadTimeCompareProps {
  /** Round 1 average lead time (ms). */
  round1AvgMs: number
  /** Round 2 average lead time (ms). */
  round2AvgMs: number
  /** Per-rocket lead times for Round 1 (ms), rocket 1..n. */
  round1LaunchesMs: number[]
  /** Per-rocket lead times for Round 2 (ms), rocket 1..n. */
  round2LaunchesMs: number[]
  /** Optional compact layout for orbit panel. */
  compact?: boolean
}

/**
 * Visual comparison of Round 1 vs Round 2 averages and the three launch lead times.
 */
export function RoundLeadTimeCompare({
  round1AvgMs,
  round2AvgMs,
  round1LaunchesMs,
  round2LaunchesMs,
  compact = false,
}: RoundLeadTimeCompareProps) {
  const improvementMs = leadTimeImprovementMs(round1AvgMs, round2AvgMs)
  const maxMs = Math.max(
    round1AvgMs,
    round2AvgMs,
    ...round1LaunchesMs,
    ...round2LaunchesMs,
    1,
  )

  const rocketCount = Math.max(
    round1LaunchesMs.length,
    round2LaunchesMs.length,
    3,
  )

  const pairs = Array.from({ length: rocketCount }, (_, i) => ({
    rocket: i + 1,
    r1: round1LaunchesMs[i],
    r2: round2LaunchesMs[i],
  }))

  function barWidth(ms: number | undefined): string {
    if (ms == null || !Number.isFinite(ms)) return '0%'
    return `${Math.max(4, Math.round((ms / maxMs) * 100))}%`
  }

  return (
    <div
      className={[
        'lt-compare',
        compact ? 'lt-compare--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Round 1 versus Round 2 lead time comparison"
    >
      <h3 className="lt-compare__heading">Lead time comparison</h3>
      <p className="lt-compare__lede">
        Average lead time for three launches — as-is (Round 1) vs redesigned
        (Round 2).
      </p>

      <div className="lt-compare__avg-row">
        <div className="lt-compare__avg-card lt-compare__avg-card--r1">
          <span className="lt-compare__avg-label">Round 1 average</span>
          <span className="lt-compare__avg-value">
            {formatLeadTime(round1AvgMs / 1000)}
          </span>
          <div className="lt-compare__bar-track" aria-hidden="true">
            <div
              className="lt-compare__bar lt-compare__bar--r1"
              style={{ width: barWidth(round1AvgMs) }}
            />
          </div>
        </div>
        <div className="lt-compare__avg-card lt-compare__avg-card--r2">
          <span className="lt-compare__avg-label">Round 2 average</span>
          <span className="lt-compare__avg-value">
            {formatLeadTime(round2AvgMs / 1000)}
          </span>
          <div className="lt-compare__bar-track" aria-hidden="true">
            <div
              className="lt-compare__bar lt-compare__bar--r2"
              style={{ width: barWidth(round2AvgMs) }}
            />
          </div>
        </div>
        <div
          className={[
            'lt-compare__avg-card lt-compare__delta',
            improvementMs > 0
              ? 'lt-compare__delta--better'
              : improvementMs < 0
                ? 'lt-compare__delta--worse'
                : 'lt-compare__delta--same',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="lt-compare__avg-label">Difference</span>
          <span className="lt-compare__avg-value">
            {improvementMs > 0
              ? `−${formatLeadTime(improvementMs / 1000)}`
              : improvementMs < 0
                ? `+${formatLeadTime((-improvementMs) / 1000)}`
                : '0:00'}
          </span>
          <span className="lt-compare__delta-note">
            {improvementMs > 0
              ? 'Round 2 faster on average'
              : improvementMs < 0
                ? 'Round 2 slower on average'
                : 'Same average lead time'}
          </span>
        </div>
      </div>

      <div className="lt-compare__launches">
        <div className="lt-compare__legend" aria-hidden="true">
          <span className="lt-compare__swatch lt-compare__swatch--r1" /> Round 1
          <span className="lt-compare__swatch lt-compare__swatch--r2" /> Round 2
        </div>
        {pairs.map(({ rocket, r1, r2 }) => {
          const pairDelta =
            r1 != null && r2 != null ? r1 - r2 : null
          return (
            <div key={rocket} className="lt-compare__pair">
              <div className="lt-compare__pair-label">Rocket {rocket}</div>
              <div className="lt-compare__pair-bars">
                <div className="lt-compare__pair-row">
                  <span className="lt-compare__pair-tag">R1</span>
                  <div className="lt-compare__bar-track">
                    <div
                      className="lt-compare__bar lt-compare__bar--r1"
                      style={{ width: barWidth(r1) }}
                    />
                  </div>
                  <span className="lt-compare__pair-time">
                    {r1 != null ? formatLeadTime(r1 / 1000) : '—'}
                  </span>
                </div>
                <div className="lt-compare__pair-row">
                  <span className="lt-compare__pair-tag">R2</span>
                  <div className="lt-compare__bar-track">
                    <div
                      className="lt-compare__bar lt-compare__bar--r2"
                      style={{ width: barWidth(r2) }}
                    />
                  </div>
                  <span className="lt-compare__pair-time">
                    {r2 != null ? formatLeadTime(r2 / 1000) : '—'}
                  </span>
                </div>
              </div>
              <div className="lt-compare__pair-delta">
                {pairDelta == null
                  ? ''
                  : pairDelta > 0
                    ? `−${formatLeadTime(pairDelta / 1000)}`
                    : pairDelta < 0
                      ? `+${formatLeadTime((-pairDelta) / 1000)}`
                      : '='}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
