import { FloodSection } from '@/lib/api'

function formatTimestamp(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const diffH = Math.round((Date.now() - d.getTime()) / 3600000)
    if (diffH < 1) return 'just now'
    if (diffH === 1) return '1 hr ago'
    if (diffH < 24) return `${diffH} hrs ago`
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d)
  } catch {
    return ''
  }
}

function RiverGauge({ level }: { level: number }) {
  // Represent level as a bar — we don't have min/max from the API, so we
  // use a log scale capped at 5 m to give a sense of magnitude.
  const MAX_M = 5
  const pct = Math.min((level / MAX_M) * 100, 100)
  const colour =
    level > 3 ? 'bg-red-500' : level > 1.5 ? 'bg-amber-400' : 'bg-blue-400'

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-500 w-14 text-right">
        {level.toFixed(2)} m
      </span>
    </div>
  )
}

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

  const { summary, current_warnings, nearest_stations, rainfall_gauges } = flood.data
  const topStations = nearest_stations.slice(0, 3)
  const stationsWithReadings = topStations.filter(s => s.latest_level_m !== null)
  const topRainfall = (rainfall_gauges ?? []).slice(0, 3)

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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Nearby river monitoring stations
          </h3>
          <ul className="space-y-3">
            {topStations.map((st, i) => (
              <li key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{st.label}</span>
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    {st.distance_km !== null && (
                      <span className="tabular-nums">{st.distance_km.toFixed(1)} km</span>
                    )}
                    {st.timestamp && (
                      <span>{formatTimestamp(st.timestamp)}</span>
                    )}
                  </div>
                </div>
                {st.latest_level_m !== null && (
                  <RiverGauge level={st.latest_level_m} />
                )}
              </li>
            ))}
          </ul>
          {stationsWithReadings.length === 0 && topStations.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">Live readings not available for nearby stations.</p>
          )}
        </div>
      )}
      {topRainfall.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent rainfall (15-min)
          </h3>
          <ul className="space-y-2">
            {topRainfall.map((g, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-700">{g.label}</span>
                  {g.distance_km !== null && (
                    <span className="text-gray-400 text-xs ml-2">{g.distance_km.toFixed(1)} km</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {g.latest_mm !== null ? (
                    <span className={`font-medium tabular-nums ${g.latest_mm > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {g.latest_mm.toFixed(1)} mm
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">no data</span>
                  )}
                  {g.timestamp && (
                    <span className="text-gray-400 text-xs">{formatTimestamp(g.timestamp)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
