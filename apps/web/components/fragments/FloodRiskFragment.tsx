import { FloodRiskSummary, SectionStatus } from '@/lib/api'
import { DropletIcon } from '@/components/ui/WidgetIcons'
import { WidgetCaveatFooter } from '@/components/fragments/WidgetCaveatFooter'

interface Props {
  flood: FloodRiskSummary | null
  status: SectionStatus
}

function WarningBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-oai-sm bg-oai-ok-bg text-oai-ok">
        No warnings
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-oai-sm bg-oai-alert-bg text-oai-alert">
      {count} active warning{count !== 1 ? 's' : ''}
    </span>
  )
}

export function FloodRiskFragment({ flood, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <DropletIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Flood</h2>
        </div>
        <p className="text-sm text-oai-caption">Flood data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !flood) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <DropletIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Flood</h2>
        </div>
        <p className="text-sm text-oai-caption">Flood data temporarily unavailable.</p>
      </div>
    )
  }

  const { postcode, summary, current_warnings, nearest_stations, source, caveats } = flood
  const nearestStation = nearest_stations[0] ?? null

  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DropletIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">Flood risk — {postcode}</h2>
      </div>

      <WarningBadge count={current_warnings.length} />

      {summary && <p className="text-sm text-oai-secondary">{summary}</p>}

      {nearestStation && (
        <div className="text-sm">
          <p className="text-xs font-medium text-oai-caption mb-1">Nearest monitoring station</p>
          <p className="font-medium text-oai-primary">{nearestStation.label}</p>
          <div className="flex gap-4 mt-0.5 text-xs text-oai-caption">
            {nearestStation.distance_km !== null && (
              <span>{nearestStation.distance_km.toFixed(1)} km away</span>
            )}
            {nearestStation.latest_level_m !== null && (
              <span>Level: {nearestStation.latest_level_m.toFixed(2)} m</span>
            )}
          </div>
        </div>
      )}

      <WidgetCaveatFooter caveats={caveats} source={source} />
    </div>
  )
}
