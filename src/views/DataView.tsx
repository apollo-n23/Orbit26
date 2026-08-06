import type { LeadTimeEntry } from '../types/process'
import { formatLeadTime } from '../lib/simulation'
import {
  averageLeadTimeMs,
  launchDurationsMs,
  leadTimeImprovementMs,
} from '../lib/roundMetrics'
import { RoundLeadTimeCompare } from '../components/RoundLeadTimeCompare'

interface DataViewProps {
  entries: LeadTimeEntry[]
  rocketsGoal?: number
  roundLabel?: string
  /** Round id (1 or 2) for comparison UI. */
  roundId?: number
  /**
   * Round 1 average lead time in ms (from localStorage after Round 1 completes).
   * Shown on Round 2 Data tab; used for post–Round-2 comparison.
   */
  round1AverageMs?: number | null
  /** Round 1 per-rocket lead times (ms) for side-by-side bars when Round 2 is complete. */
  round1LaunchesMs?: number[] | null
}

function formatRoadCost(cost: number | undefined): string {
  if (cost == null) return '—'
  return `${cost} pts`
}

export function DataView({
  entries,
  rocketsGoal = 3,
  roundLabel,
  roundId = 1,
  round1AverageMs = null,
  round1LaunchesMs = null,
}: DataViewProps) {
  const bestMs =
    entries.length > 0
      ? Math.min(...entries.map((e) => e.durationMs))
      : null

  const ordered = [...entries].sort((a, b) => b.runNumber - a.runNumber)
  const thisRoundAvgMs = averageLeadTimeMs(entries)
  const round2LaunchesMs = launchDurationsMs(entries)
  const roundComplete = entries.length >= rocketsGoal

  const hasAnyRoadCost = entries.some((e) => e.roadCost != null)
  const roadCostSample = entries.find((e) => e.roadCost != null)?.roadCost

  const showRound1Baseline = roundId === 2 && round1AverageMs != null
  const showFullCompare =
    roundId === 2 &&
    roundComplete &&
    thisRoundAvgMs != null &&
    round1AverageMs != null &&
    (round1LaunchesMs?.length ?? 0) > 0

  const improvementMs =
    showFullCompare && thisRoundAvgMs != null && round1AverageMs != null
      ? leadTimeImprovementMs(round1AverageMs, thisRoundAvgMs)
      : null

  return (
    <section className="view-panel" aria-labelledby="data-heading">
      <header className="view-panel__header">
        <h2 id="data-heading">Data</h2>
        <p className="view-panel__lede">
          {roundLabel ? `${roundLabel} — ` : ''}
          Lead time board for this round. Goal: log {rocketsGoal} full launch
          cycles (assembly through liftoff). Newest runs at the top.
        </p>
      </header>

      <div className="view-panel__body data-body">
        <div className="lead-board__progress" aria-live="polite">
          Rockets launched: <strong>{entries.length}</strong> / {rocketsGoal}
          {roundComplete ? ' · Round complete' : ''}
        </div>

        {showFullCompare &&
          round1AverageMs != null &&
          thisRoundAvgMs != null &&
          round1LaunchesMs && (
            <RoundLeadTimeCompare
              round1AvgMs={round1AverageMs}
              round2AvgMs={thisRoundAvgMs}
              round1LaunchesMs={round1LaunchesMs}
              round2LaunchesMs={round2LaunchesMs}
            />
          )}

        {!showFullCompare && (showRound1Baseline || thisRoundAvgMs != null) && (
          <div className="lead-board__compare" aria-live="polite">
            {showRound1Baseline && (
              <div className="lead-board__stat lead-board__stat--baseline">
                <span className="lead-board__stat-label">
                  Round 1 average lead time
                </span>
                <span className="lead-board__stat-value">
                  {formatLeadTime(round1AverageMs / 1000)}
                </span>
              </div>
            )}
            {thisRoundAvgMs != null && entries.length > 0 && (
              <div className="lead-board__stat">
                <span className="lead-board__stat-label">
                  {roundId === 2
                    ? 'Round 2 average lead time'
                    : 'Round average lead time'}
                </span>
                <span className="lead-board__stat-value">
                  {formatLeadTime(thisRoundAvgMs / 1000)}
                  {!roundComplete && entries.length < rocketsGoal
                    ? ' · running'
                    : ''}
                </span>
              </div>
            )}
            {improvementMs != null && (
              <div
                className={[
                  'lead-board__stat',
                  improvementMs > 0
                    ? 'lead-board__stat--better'
                    : improvementMs < 0
                      ? 'lead-board__stat--worse'
                      : 'lead-board__stat--same',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="lead-board__stat-label">
                  vs Round 1 average
                </span>
                <span className="lead-board__stat-value">
                  {improvementMs > 0
                    ? `−${formatLeadTime(improvementMs / 1000)} (faster)`
                    : improvementMs < 0
                      ? `+${formatLeadTime((-improvementMs) / 1000)} (slower)`
                      : 'Same average'}
                </span>
              </div>
            )}
          </div>
        )}

        {ordered.length === 0 ? (
          <p className="placeholder-copy">
            {showRound1Baseline
              ? 'Round 1 average is shown above. Complete launches this round to build the Round 2 board and compare averages.'
              : 'No lead times logged yet. Start a session and complete full process runs to launch. Each successful launch adds a lap here.'}
          </p>
        ) : (
          <div className="lead-board">
            <div className="lead-board__summary">
              <div className="lead-board__stat">
                <span className="lead-board__stat-label">Runs logged</span>
                <span className="lead-board__stat-value">
                  {entries.length}/{rocketsGoal}
                </span>
              </div>
              <div className="lead-board__stat lead-board__stat--best">
                <span className="lead-board__stat-label">Best lead time</span>
                <span className="lead-board__stat-value">
                  {formatLeadTime(bestMs != null ? bestMs / 1000 : null)}
                </span>
              </div>
              {hasAnyRoadCost && (
                <div className="lead-board__stat">
                  <span className="lead-board__stat-label">Road cost</span>
                  <span className="lead-board__stat-value">
                    {formatRoadCost(roadCostSample)}
                  </span>
                </div>
              )}
            </div>

            <table className="lead-board__table">
              <thead>
                <tr>
                  <th scope="col">Rocket</th>
                  <th scope="col">Lead time</th>
                  <th scope="col">Road cost</th>
                  <th scope="col">Delta vs best</th>
                  <th scope="col">Logged</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((entry) => {
                  const isBest =
                    bestMs != null && entry.durationMs === bestMs
                  const deltaMs =
                    bestMs != null ? entry.durationMs - bestMs : 0
                  const logged = new Date(entry.completedAt)
                  const timeLabel = logged.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <tr
                      key={`${entry.runNumber}-${entry.completedAt}`}
                      className={
                        isBest
                          ? 'lead-board__row lead-board__row--best'
                          : 'lead-board__row'
                      }
                    >
                      <td className="lead-board__run">
                        #{entry.runNumber}
                        {isBest ? (
                          <span className="lead-board__best-tag">Best</span>
                        ) : null}
                      </td>
                      <td className="lead-board__time">
                        {formatLeadTime(entry.durationMs / 1000)}
                      </td>
                      <td className="lead-board__road-cost">
                        {formatRoadCost(entry.roadCost)}
                      </td>
                      <td className="lead-board__delta">
                        {isBest
                          ? '—'
                          : `+${formatLeadTime(deltaMs / 1000)}`}
                      </td>
                      <td className="lead-board__when">{timeLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
