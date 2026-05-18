import Link from 'next/link'
import { getReport } from '@/lib/api'
import AreaSummaryCard from '@/components/AreaSummaryCard'
import CrimeTrendCard from '@/components/CrimeTrendCard'
import FloodRiskCard from '@/components/FloodRiskCard'
import MapWrapper from '@/components/MapWrapper'
import PlanningApplicationsCard from '@/components/PlanningApplicationsCard'
import SourceCaveatFooter from '@/components/SourceCaveatFooter'

interface Props {
  params: Promise<{ postcode: string }>
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default async function ReportPage({ params }: Props) {
  const { postcode } = await params
  const report = await getReport(postcode)

  if (!report) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Postcode not found</h1>
          <p className="text-gray-600 mb-6">This postcode could not be found. Please check the postcode and try again.</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to search
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-1">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            &larr; Back to search
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {report.postcode}
          </h1>
          {report.area.data?.admin_district && (
            <p className="text-gray-500 mt-1">{report.area.data.admin_district}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Generated {formatDate(report.generated_at)}
          </p>
        </div>

        <div className="space-y-4">
          <AreaSummaryCard area={report.area} />
          {report.area.status === 'available' && report.area.data && (
            <MapWrapper
              postcode={report.postcode}
              lat={report.area.data.latitude}
              lng={report.area.data.longitude}
            />
          )}
          <CrimeTrendCard crime={report.sections.crime} />
          <FloodRiskCard flood={report.sections.flood} />
          <PlanningApplicationsCard planning={report.sections.planning} />
        </div>

        <SourceCaveatFooter sources={report.sources} />
      </div>
    </main>
  )
}
