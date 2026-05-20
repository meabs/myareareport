import { Area, SectionStatus } from '@/lib/api'
import { MapPinIcon } from '@/components/ui/WidgetIcons'

interface Props {
  area: Area | null
  status: SectionStatus
}

export function InlineAreaSummary({ area, status }: Props) {
  if (status !== 'available' || !area) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <p className="text-sm text-oai-caption">Area data unavailable.</p>
      </div>
    )
  }

  const { postcode, admin_district, region, country, source } = area

  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
      <div className="flex items-center gap-2 mb-1">
        <MapPinIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">Area — {postcode}</h2>
      </div>
      <p className="text-xl font-bold text-oai-primary tracking-tight">{postcode}</p>
      <p className="text-sm text-oai-secondary mt-0.5">
        {[admin_district, region, country].filter(Boolean).join(' · ')}
      </p>
      <p className="text-xs text-oai-caption mt-3">Source: {source}</p>
    </div>
  )
}
