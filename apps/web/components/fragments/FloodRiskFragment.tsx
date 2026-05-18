import { FloodRiskSummary, SectionStatus } from '@/lib/api'

interface Props {
  flood: FloodRiskSummary | null
  status: SectionStatus
}

export function FloodRiskFragment({ flood, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Flood</p>
        <p className="text-sm text-gray-500">Flood data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !flood) {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Flood</p>
        <p className="text-sm text-gray-500">Flood data temporarily unavailable.</p>
      </div>
    )
  }

  const { summary, current_warnings, nearest_stations, source, caveats } = flood
  const nearestStation = nearest_stations[0] ?? null
  const warningCount = current_warnings.length

  return (
    <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Flood</p>

      {summary && <p className="text-sm text-gray-700">{summary}</p>}

      <p className="text-sm text-gray-700">
        <span className="font-semibold text-gray-900 text-base">{warningCount}</span>
        {' '}active warning{warningCount !== 1 ? 's' : ''}
      </p>

      {nearestStation && (
        <div className="text-sm text-gray-700">
          <p className="text-xs font-medium text-gray-500 mb-1">Nearest monitoring station</p>
          <p className="font-medium text-gray-800">{nearestStation.label}</p>
          <div className="flex gap-4 mt-0.5 text-xs text-gray-500">
            {nearestStation.distance_km !== null && (
              <span>{nearestStation.distance_km.toFixed(1)} km away</span>
            )}
            {nearestStation.latest_level_m !== null && (
              <span>Level: {nearestStation.latest_level_m.toFixed(2)} m</span>
            )}
          </div>
        </div>
      )}

      <a
        href="https://environment.data.gov.uk/flood-monitoring/id/floods"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-blue-600 hover:underline"
      >
        View official flood warnings
      </a>

      {caveats.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            Data notes ({caveats.length})
          </summary>
          <ul className="mt-1 space-y-0.5">
            {caveats.map((c, i) => (
              <li key={i} className="text-xs text-gray-400">{c}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-gray-400">Source: {source}</p>
    </div>
  )
}
