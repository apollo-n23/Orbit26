import type { LeadTimeEntry } from '../types/process'
import type { RoundConfig } from '../types/round'
import { formatLeadTime } from '../lib/simulation'
import { hashForRound } from '../types/round'

interface OrbitCompleteSceneProps {
  round: RoundConfig
  leadTimes: LeadTimeEntry[]
  /** Shareable absolute URL for Round 2 (tutor link). */
  round2ShareUrl: string
  onGoToRound2?: () => void
}

export function OrbitCompleteScene({
  round,
  leadTimes,
  round2ShareUrl,
  onGoToRound2,
}: OrbitCompleteSceneProps) {
  const bestMs =
    leadTimes.length > 0
      ? Math.min(...leadTimes.map((e) => e.durationMs))
      : null

  return (
    <section
      className="orbit-complete"
      aria-labelledby="orbit-complete-heading"
    >
      <div className="orbit-complete__sky" aria-hidden="true">
        <div className="orbit-complete__earth">
          <span className="orbit-complete__continent orbit-complete__continent--a" />
          <span className="orbit-complete__continent orbit-complete__continent--b" />
          <span className="orbit-complete__glow" />
        </div>

        <div className="orbit-complete__orbit orbit-complete__orbit--1">
          <span className="orbit-complete__sat" title="Satellite 1" />
        </div>
        <div className="orbit-complete__orbit orbit-complete__orbit--2">
          <span className="orbit-complete__sat" title="Satellite 2" />
        </div>
        <div className="orbit-complete__orbit orbit-complete__orbit--3">
          <span className="orbit-complete__sat" title="Satellite 3" />
        </div>
      </div>

      <div className="orbit-complete__panel">
        <p className="orbit-complete__kicker">Round {round.id}</p>
        <h2 id="orbit-complete-heading" className="orbit-complete__title">
          {round.completeHeadline}
        </h2>
        <p className="orbit-complete__sub">{round.completeSubline}</p>

        {leadTimes.length > 0 && (
          <ul className="orbit-complete__laps">
            {leadTimes
              .slice()
              .sort((a, b) => a.runNumber - b.runNumber)
              .map((entry) => (
                <li key={entry.runNumber}>
                  <span>Rocket {entry.runNumber}</span>
                  <span className="orbit-complete__lap-time">
                    {formatLeadTime(entry.durationMs / 1000)}
                    {bestMs != null && entry.durationMs === bestMs
                      ? ' · best'
                      : ''}
                  </span>
                </li>
              ))}
          </ul>
        )}

        {round.id === 1 && (
          <div className="orbit-complete__next">
            {onGoToRound2 && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={onGoToRound2}
              >
                Continue to Round 2
              </button>
            )}
            <p className="orbit-complete__share">
              Tutor share link for Round 2:
              <a href={hashForRound(2)} className="orbit-complete__link">
                {round2ShareUrl}
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
