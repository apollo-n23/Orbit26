import type { LeadTimeEntry, RedesignCostBreakdown } from '../types/process'
import { formatLeadTime } from '../lib/simulation'
import { averageLeadTimeMs, launchDurationsMs } from '../lib/roundMetrics'
import { REDESIGN_BUDGET } from '../lib/redesignCost'
import { formatHeightAchieved } from '../lib/flightMetrics'
import { buildDataCsv, downloadCsv } from '../lib/csvExport'
import { RoundLeadTimeCompare } from '../components/RoundLeadTimeCompare'

/** One round's live lead-time log, labeled for display on the Data tab. */
export interface RoundLeadTimeSection {
  roundId: 1 | 2
  roundLabel: string
  entries: LeadTimeEntry[]
}

interface DataViewProps {
  /** Both rounds' live entries, e.g. [round1Section, round2Section]. */
  rounds: RoundLeadTimeSection[]
  rocketsGoal?: number
  /** To-be confirmed redesign cost breakdown, or null before Confirm. */
  round2CostBreakdown?: RedesignCostBreakdown | null
}

function formatCost(cost: number | undefined): string {
  if (cost == null) return '—'
  return `${cost} pts`
}

/** Cost of improvement summary: total + breakdown by source, for To-be. */
function RedesignCostSummary({ cost }: { cost: RedesignCostBreakdown }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Manufacture — machine moves', value: cost.machineMoveCost },
    {
      label: 'Manufacture — auto-transfer upgrade',
      value: cost.autoTransferCost,
    },
    { label: 'Haul road — tiles', value: cost.roadCost },
    { label: 'Launch prep — technology', value: cost.launchPrepTechCost },
    {
      label: 'Launch sequence — realigns & removals',
      value: cost.goRealignCost + cost.rangeRemovalCost,
    },
    {
      label: 'Launch sequence — key lubrication',
      value: cost.keyLubricationCost,
    },
  ]
  const accrued = rows.filter((r) => r.value > 0)

  return (
    <div className="lead-board__round-section">
      <h3 className="lead-board__round-heading">
        Total cost of improvement — To-be
      </h3>
      <p className="view-panel__lede">
        To-be has a {REDESIGN_BUDGET} pt improvement budget. Builds as you
        invest in redesign upgrades. Only removing road tiles brings it back
        down — every other investment is permanent for the round once
        selected.
      </p>
      <div className="lead-board__summary">
        <div className="lead-board__stat lead-board__stat--best">
          <span className="lead-board__stat-label">Total cost</span>
          <span className="lead-board__stat-value">
            {formatCost(cost.total)} / {REDESIGN_BUDGET} pts
          </span>
        </div>
        {accrued.length === 0 ? (
          <div className="lead-board__stat">
            <span className="lead-board__stat-label">Breakdown</span>
            <span className="lead-board__stat-value">No cost yet</span>
          </div>
        ) : (
          accrued.map((row) => (
            <div className="lead-board__stat" key={row.label}>
              <span className="lead-board__stat-label">{row.label}</span>
              <span className="lead-board__stat-value">
                {formatCost(row.value)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** One round's lead-time board: progress line + summary + table, or a placeholder. */
function RoundLeadBoard({
  section,
  rocketsGoal,
}: {
  section: RoundLeadTimeSection
  rocketsGoal: number
}) {
  const { roundLabel, entries } = section
  const bestMs =
    entries.length > 0 ? Math.min(...entries.map((e) => e.durationMs)) : null
  const ordered = [...entries].sort((a, b) => b.runNumber - a.runNumber)
  const roundComplete = entries.length >= rocketsGoal
  const hasAnyCost = entries.some((e) => e.costBreakdown != null)
  const costSample = entries.find((e) => e.costBreakdown != null)?.costBreakdown
  const totalDefects = entries.reduce((sum, e) => sum + (e.defectCount ?? 0), 0)

  return (
    <div className="lead-board__round-section">
      <h3 className="lead-board__round-heading">{roundLabel}</h3>

      <div className="lead-board__progress" aria-live="polite">
        Rockets launched: <strong>{entries.length}</strong> / {rocketsGoal}
        {roundComplete ? ' · Round complete' : ''}
      </div>

      {ordered.length === 0 ? (
        <p className="placeholder-copy">
          No launches logged yet for {roundLabel}. Complete full process runs
          in this round to add laps here.
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
            {hasAnyCost && (
              <div className="lead-board__stat">
                <span className="lead-board__stat-label">Redesign cost</span>
                <span className="lead-board__stat-value">
                  {formatCost(costSample?.total)}
                </span>
              </div>
            )}
            <div
              className={
                totalDefects > 0
                  ? 'lead-board__stat lead-board__stat--worse'
                  : 'lead-board__stat'
              }
            >
              <span className="lead-board__stat-label">Total defects</span>
              <span className="lead-board__stat-value">{totalDefects}</span>
            </div>
          </div>

          <table className="lead-board__table">
            <thead>
              <tr>
                <th scope="col">Rocket</th>
                <th scope="col">Lead time</th>
                <th scope="col">Height achieved</th>
                <th scope="col">Redesign cost</th>
                <th scope="col">Defects</th>
                <th scope="col">Delta vs best</th>
                <th scope="col">Logged</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((entry) => {
                const isBest = bestMs != null && entry.durationMs === bestMs
                const deltaMs = bestMs != null ? entry.durationMs - bestMs : 0
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
                    <td className="lead-board__height">
                      {formatHeightAchieved(entry)}
                    </td>
                    <td className="lead-board__road-cost">
                      {formatCost(entry.costBreakdown?.total)}
                    </td>
                    <td className="lead-board__defects">
                      {entry.defectCount ?? 0}
                    </td>
                    <td className="lead-board__delta">
                      {isBest ? '—' : `+${formatLeadTime(deltaMs / 1000)}`}
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
  )
}

export function DataView({
  rounds,
  rocketsGoal = 3,
  round2CostBreakdown = null,
}: DataViewProps) {
  const round1 = rounds.find((r) => r.roundId === 1)
  const round2 = rounds.find((r) => r.roundId === 2)

  const round1AvgMs = round1 ? averageLeadTimeMs(round1.entries) : null
  const round2AvgMs = round2 ? averageLeadTimeMs(round2.entries) : null

  const showFullCompare =
    round1 != null &&
    round2 != null &&
    round1.entries.length >= rocketsGoal &&
    round2.entries.length >= rocketsGoal &&
    round1AvgMs != null &&
    round2AvgMs != null

  const hasAnyEntries = rounds.some((r) => r.entries.length > 0)

  function handleDownloadCsv() {
    const csv = buildDataCsv(
      rounds.map((r) => ({ roundLabel: r.roundLabel, entries: r.entries })),
    )
    downloadCsv('orbit26-lead-time-data.csv', csv)
  }

  return (
    <section className="view-panel" aria-labelledby="data-heading">
      <header className="view-panel__header data-header">
        <div>
          <h2 id="data-heading">Data</h2>
          <p className="view-panel__lede">
            Lead time board for both rounds. Goal: log {rocketsGoal} full
            launch cycles (assembly through liftoff) per round. Newest runs
            at the top of each round's table.
          </p>
        </div>
        <div className="data-header__controls">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleDownloadCsv}
            disabled={!hasAnyEntries}
          >
            Download CSV
          </button>
        </div>
      </header>

      <div className="view-panel__body data-body">
        {showFullCompare && (
          <RoundLeadTimeCompare
            round1AvgMs={round1AvgMs}
            round2AvgMs={round2AvgMs}
            round1LaunchesMs={launchDurationsMs(round1.entries)}
            round2LaunchesMs={launchDurationsMs(round2.entries)}
          />
        )}

        {round2CostBreakdown && (
          <RedesignCostSummary cost={round2CostBreakdown} />
        )}

        {rounds.map((section) => (
          <RoundLeadBoard
            key={section.roundId}
            section={section}
            rocketsGoal={rocketsGoal}
          />
        ))}
      </div>
    </section>
  )
}
