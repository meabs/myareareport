import { PlanningSummary, SectionStatus } from '@/lib/api'

interface Props {
  planning: PlanningSummary | null
  status: SectionStatus
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
      {status}
    </span>
  )
}

export function PlanningApplicationsFragment({ planning, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Planning Applications</p>
        <p className="text-sm text-gray-500">Planning data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !planning) {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Planning Applications</p>
        <p className="text-sm text-gray-500">Planning data temporarily unavailable.</p>
      </div>
    )
  }

  const { summary, applications, caveats } = planning
  const topThree = applications.slice(0, 3)

  return (
    <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Planning Applications</p>

      {summary && <p className="text-sm text-gray-700">{summary}</p>}

      {topThree.length > 0 && (
        <ul className="space-y-3">
          {topThree.map((app) => (
            <li key={app.reference} className="border border-gray-100 rounded-md p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500">{app.reference}</span>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-gray-800">{truncate(app.description, 80)}</p>
              <p className="text-xs text-gray-400">{app.address}</p>
            </li>
          ))}
        </ul>
      )}

      {caveats.length > 0 && (
        <ul className="space-y-0.5">
          {caveats.map((c, i) => (
            <li key={i} className="text-xs text-gray-400">{c}</li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400">Source: planning.data.gov.uk</p>
    </div>
  )
}
