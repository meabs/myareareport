import { FloodSection } from '@/lib/api'

export default function FloodRiskCard({ flood }: { flood: FloodSection }) {
  if (flood.status === 'not_implemented') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Flood</h2>
        <p className="text-gray-500 text-sm">Flood data coming soon.</p>
      </div>
    )
  }

  if (flood.status !== 'available' || !flood.data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Flood</h2>
        <p className="text-gray-500 text-sm">Flood data temporarily unavailable.</p>
      </div>
    )
  }

  const { summary, current_warnings, nearest_stations } = flood.data
  const topStations = nearest_stations.slice(0, 3)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Flood</h2>
      {summary && <p className="text-sm text-gray-700 mb-4">{summary}</p>}
      <div className="mb-4">
        <span className="text-2xl font-bold text-gray-900">{current_warnings.length}</span>
        <span className="text-sm text-gray-500 ml-2">current warning{current_warnings.length !== 1 ? 's' : ''}</span>
      </div>
      {current_warnings.length > 0 && (
        <ul className="mb-4 space-y-2">
          {current_warnings.map((w, i) => (
            <li key={i} className="text-sm border-l-4 border-amber-400 pl-3 py-1">
              <span className="font-medium text-gray-800">{w.severity}</span>
              {w.area && <span className="text-gray-600"> — {w.area}</span>}
              {w.message && <p className="text-gray-600 mt-0.5">{w.message}</p>}
            </li>
          ))}
        </ul>
      )}
      {topStations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nearby monitoring stations</h3>
          <ul className="space-y-2">
            {topStations.map((st, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center justify-between">
                <span>{st.label}</span>
                {st.distance_km !== null && (
                  <span className="text-gray-500 tabular-nums">{st.distance_km.toFixed(1)} km</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
