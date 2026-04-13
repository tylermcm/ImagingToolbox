import { formatDecDegrees, formatRaHours } from '../domain/targetResolver'
import type { ResolvedTarget } from '../domain/types'

interface TargetSearchPanelProps {
  targetQuery: string
  onTargetQueryChange: (query: string) => void
  onResolve: () => void
  suggestions: ResolvedTarget[]
  onSelectSuggestion: (target: ResolvedTarget) => void
  resolvedTarget: ResolvedTarget | null
  recentTargets: ResolvedTarget[]
  showRecentTargets: boolean
  onSelectRecentTarget: (target: ResolvedTarget) => void
}

export function TargetSearchPanel({
  targetQuery,
  onTargetQueryChange,
  onResolve,
  suggestions,
  onSelectSuggestion,
  resolvedTarget,
  recentTargets,
  showRecentTargets,
  onSelectRecentTarget,
}: TargetSearchPanelProps) {
  return (
    <div className="panel-section">
      <h2>Target Resolution</h2>
      <p className="section-caption">
        Search catalog targets or enter coordinates like{' '}
        <code>05:35:17 -05:23:28</code>.
      </p>

      <form
        className="target-search-row"
        onSubmit={(event) => {
          event.preventDefault()
          onResolve()
        }}
      >
        <input
          type="text"
          value={targetQuery}
          onChange={(event) => onTargetQueryChange(event.target.value)}
          placeholder="M42, Andromeda, or RA/Dec"
          aria-label="Target search"
        />
        <button type="submit">Resolve</button>
      </form>

      {suggestions.length > 0 ? (
        <ul className="target-suggestions">
          {suggestions.map((target) => (
            <li key={target.id}>
              <button type="button" onClick={() => onSelectSuggestion(target)}>
                {target.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="resolved-card">
        {resolvedTarget ? (
          <>
            <p className="resolved-title">{resolvedTarget.name}</p>
            <p>
              RA {formatRaHours(resolvedTarget.raHours)} | Dec{' '}
              {formatDecDegrees(resolvedTarget.decDeg)}
            </p>
            <p className="mono">Source: {resolvedTarget.source}</p>
          </>
        ) : (
          <p>No target resolved yet.</p>
        )}
      </div>

      {showRecentTargets && recentTargets.length > 0 ? (
        <div className="recent-targets">
          <p className="recent-targets-title">Recent targets</p>
          <ul className="target-suggestions recent-target-list">
            {recentTargets.map((target) => (
              <li key={target.id}>
                <button type="button" onClick={() => onSelectRecentTarget(target)}>
                  <span className="recent-target-name">{target.name}</span>
                  <span className="recent-target-meta">
                    RA {formatRaHours(target.raHours)} | Dec{' '}
                    {formatDecDegrees(target.decDeg)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
