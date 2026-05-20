import { AirQualitySection } from '@/lib/api'

const LABEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Low:         { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  Moderate:    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  High:        { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Very High': { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  Unknown:     { bg: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const diffM = Math.round((Date.now() - d.getTime()) / 60000)
    if (diffM < 2) return 'just now'
    if (diffM < 60) return `${diffM} min ago`
    const diffH = Math.round(diffM / 60)
    if (diffH === 1) return '1 hr ago'
    return `${diffH} hrs ago`
  } catch {
    return ''
  }
}

const PARAM_LABELS: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
}

export default function AirQualityCard({ airQuality }: { airQuality: AirQualitySection }) {
  if (airQuality.status !== 'available' || !airQuality.data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Air Quality</h2>
        <p className="text-gray-500 text-sm">
          {airQuality.status === 'unavailable'
            ? 'Air quality data temporarily unavailable.'
            : 'Air quality data coming soon.'}
        </p>
      </div>
    )
  }

  const { aqi_label, aqi_index, nearest_station, summary } = airQuality.data
  const styles = LABEL_STYLES[aqi_label] ?? LABEL_STYLES['Unknown']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Air Quality</h2>
      {summary && <p className="text-sm text-gray-700 mb-4">{summary}</p>}

      {aqi_label !== 'Unknown' && (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${styles.bg} mb-4`}>
          <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
          <span className={`font-semibold ${styles.text}`}>{aqi_label}</span>
          {aqi_index !== null && (
            <span className={`text-sm ${styles.text} opacity-75`}>DAQI ~{aqi_index}</span>
          )}
        </div>
      )}

      {nearest_station && nearest_station.readings.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Latest readings
            {nearest_station.distance_km !== null && (
              <span className="font-normal ml-1">— sensor {nearest_station.distance_km} km away</span>
            )}
          </h3>
          <ul className="space-y-1.5">
            {nearest_station.readings.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{PARAM_LABELS[r.parameter] ?? r.parameter.toUpperCase()}</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">{r.value.toFixed(1)} {r.unit}</span>
                  {r.last_updated && (
                    <span className="text-gray-400 text-xs ml-2">{formatLastUpdated(r.last_updated)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Source: Sensor.Community citizen science network</p>
    </div>
  )
}
