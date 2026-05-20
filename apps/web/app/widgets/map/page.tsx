import { getCrimeIncidents, getReport, getStopSearch } from '@/lib/api'
import { MapPinIcon } from '@/components/ui/WidgetIcons'
import MapWrapper from '@/components/MapWrapper'

interface Props {
  searchParams: Promise<{ postcode?: string }>
}

export default async function MapWidgetPage({ searchParams }: Props) {
  const { postcode } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption p-4 max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;show map for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const [report, incidentList, stopSearchData] = await Promise.all([
    getReport(pc),
    getCrimeIncidents(pc, 3),
    getStopSearch(pc, 3),
  ])

  if (!report?.area.data) {
    return (
      <p className="text-sm text-oai-caption p-4 max-w-[480px]">
        Postcode <strong>{pc}</strong> wasn&apos;t recognised — check the format, e.g. <em>CH1 4AB</em>.
      </p>
    )
  }

  const { latitude, longitude } = report.area.data

  return (
    // F1: fullscreen map widget — uses full viewport height
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <div className="flex items-center gap-2 px-4 py-2 bg-oai-surface border-b border-oai-line shrink-0">
        <MapPinIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <span className="text-sm font-semibold text-oai-primary">Map — {pc}</span>
        <span className="text-xs text-oai-caption ml-1">
          {report.area.data.admin_district ?? report.area.data.region ?? ''}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <MapWrapper
          postcode={pc}
          lat={latitude}
          lng={longitude}
          initialIncidents={incidentList?.incidents ?? []}
          initialStopSearches={stopSearchData?.records ?? []}
        />
      </div>
    </div>
  )
}
