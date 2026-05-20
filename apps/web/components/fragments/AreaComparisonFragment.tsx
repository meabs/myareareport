import { Area, CrimeSummary, FloodRiskSummary } from '@/lib/api'

interface Props {
  areaA: Area
  crimeA: CrimeSummary | null
  areaB: Area
  crimeB: CrimeSummary | null
  floodA?: FloodRiskSummary | null
  floodB?: FloodRiskSummary | null
}

interface ColumnProps {
  area: Area
  crime: CrimeSummary | null
  flood?: FloodRiskSummary | null
}

function AreaColumn({ area, crime, flood }: ColumnProps) {
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <p className="font-bold text-oai-primary text-base">{area.postcode}</p>
      <p className="text-xs text-oai-caption leading-snug">
        {[area.admin_district, area.region].filter(Boolean).join(', ')}
      </p>

      {crime !== null ? (
        <div className="text-sm text-oai-secondary">
          <span className="font-semibold text-oai-primary">{crime.total_incidents.toLocaleString()}</span>
          {' '}incidents / {crime.period_months} mo
        </div>
      ) : (
        <p className="text-xs text-oai-caption">Crime data unavailable</p>
      )}

      {flood !== undefined && (
        flood !== null ? (
          <div className="text-sm text-oai-secondary">
            <span className="font-semibold text-oai-primary">{flood.current_warnings.length}</span>
            {' '}flood warning{flood.current_warnings.length !== 1 ? 's' : ''}
          </div>
        ) : (
          <p className="text-xs text-oai-caption">Flood data unavailable</p>
        )
      )}
    </div>
  )
}

export function AreaComparisonFragment({ areaA, crimeA, areaB, crimeB, floodA, floodB }: Props) {
  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4 space-y-3">
      <h2 className="text-sm font-semibold text-oai-primary">
        Comparing {areaA.postcode} vs {areaB.postcode}
      </h2>

      <div className="flex gap-4">
        <AreaColumn area={areaA} crime={crimeA} flood={floodA} />
        <div className="w-px bg-oai-line self-stretch" />
        <AreaColumn area={areaB} crime={crimeB} flood={floodB} />
      </div>

      <p className="text-xs text-oai-caption">
        Data comparisons are based on public datasets that may have different coverage or lag times.
      </p>
    </div>
  )
}
