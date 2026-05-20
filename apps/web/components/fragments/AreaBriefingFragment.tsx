import { Area, CrimeSummary, FloodRiskSummary, PlanningSummary, SectionStatus } from '@/lib/api'
import { MapPinIcon } from '@/components/ui/WidgetIcons'

interface Section<T> {
  status: SectionStatus
  summary: string | null
  data: T | null
}

interface Props {
  area: Area | null
  crime: Section<CrimeSummary>
  flood: Section<FloodRiskSummary>
  planning: Section<PlanningSummary>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-t border-oai-line-muted first:border-t-0">
      <span className="text-xs font-semibold text-oai-caption uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-oai-secondary text-right">{value}</span>
    </div>
  )
}

function crimeValue(crime: Section<CrimeSummary>): string {
  if (crime.status !== 'available' || !crime.data) return 'Data unavailable'
  const { total_incidents, period_months } = crime.data
  return `${total_incidents.toLocaleString()} incidents (${period_months}mo)`
}

function floodValue(flood: Section<FloodRiskSummary>): string {
  if (flood.status !== 'available' || !flood.data) return 'Data unavailable'
  const count = flood.data.current_warnings.length
  return count === 0 ? 'No active warnings' : `${count} active warning${count !== 1 ? 's' : ''}`
}

function planningValue(planning: Section<PlanningSummary>): string {
  if (planning.status !== 'available' || !planning.data) return 'Data unavailable'
  const { application_count, radius_km } = planning.data
  return `${application_count} application${application_count !== 1 ? 's' : ''} within ${radius_km} km`
}

export function AreaBriefingFragment({ area, crime, flood, planning }: Props) {
  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4" role="region" aria-label="Area briefing">
      <div className="flex items-center gap-2 mb-3">
        <MapPinIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">
          {area ? `Area briefing — ${area.postcode}` : 'Area briefing'}
        </h2>
      </div>

      {area ? (
        <div className="mb-3">
          <p className="text-lg font-bold text-oai-primary tracking-tight">{area.postcode}</p>
          <p className="text-sm text-oai-secondary mt-0.5">
            {[area.admin_district, area.region, area.country].filter(Boolean).join(' · ')}
          </p>
        </div>
      ) : (
        <p className="text-sm text-oai-caption mb-3">Area data unavailable.</p>
      )}

      <div>
        <SummaryRow label="Crime"    value={crimeValue(crime)} />
        <SummaryRow label="Flood"    value={floodValue(flood)} />
        <SummaryRow label="Planning" value={planningValue(planning)} />
      </div>

      <p className="text-xs text-oai-caption mt-3">
        Public data only. Not for emergency, legal, or insurance decisions.
      </p>
    </div>
  )
}
