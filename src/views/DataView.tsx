import type { LeadTimeEntry } from '../types/process'
import { formatLeadTime } from '../lib/simulation'

interface DataViewProps {
  entries: LeadTimeEntry[]
}

export function DataView({ entries }: DataViewProps) {
  const bestMs =
    entries.length > 0
      ? Math.min(...entries.map((e) => e.durationMs))
      : null

  // Newest run at the top (lap board style).
  const ordered = [...entries].sort((a, b) => b.runNumber - a.runNumber)

  return (
    <section className="view-panel" aria-labelledby="data-heading">
      <header className="view-panel__header">
        <h2 id="data-heading">Data</h2>
        <p className="view-panel__lede">
          Lead time board — each completed launch cycle (assembly through
          liftoff) logs end-to-end process time. Improve the process, beat your
          best lap.
        </p>
      </header>

      <div className="view-panel__body data-body">
        {ordered.length === 0 ? (
          <p className="placeholder-copy">
            No lead times logged yet. Start a session, run the full process to
            launch, and each completed unit will appear here.
          </p>
        ) : (
          <div className="lead-board">
            <div className="lead-board__summary" aria-live="polite">
              <div className="lead-board__stat">
                <span className="lead-board__stat-label">Runs logged</span>
                <span className="lead-board__stat-value">{entries.length}</span>
              </div>
              <div className="lead-board__stat lead-board__stat--best">
                <span className="lead-board__stat-label">Best lead time</span>
                <span className="lead-board__stat-value">
                  {formatLeadTime(bestMs != null ? bestMs / 1000 : null)}
                </span>
              </div>
            </div>

            <table className="lead-board__table">
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Lead time</th>
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
                        isBest ? 'lead-board__row lead-board__row--best' : 'lead-board__row'
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
