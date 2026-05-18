import { Area, SectionStatus } from '@/lib/api'

interface Props {
  area: Area | null
  status: SectionStatus
}

export function InlineAreaSummary({ area, status }: Props) {
  if (status !== 'available' || !area) {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">Area data unavailable.</p>
      </div>
    )
  }

  const { postcode, admin_district, region, country, source } = area

  return (
    <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{postcode}</p>
      <p className="text-sm text-gray-600 mt-1">
        {[admin_district, region, country].filter(Boolean).join(' · ')}
      </p>
      <p className="text-xs text-gray-400 mt-3">Source: {source}</p>
    </div>
  )
}
