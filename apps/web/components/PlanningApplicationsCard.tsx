import type { PlanningSummary, SectionStatus } from '@/lib/api'

interface PlanningSection {
  status: SectionStatus
  summary: string | null
  data: PlanningSummary | null
}

export default function PlanningApplicationsCard({ planning }: { planning: PlanningSection }) {
  if (planning.status === 'not_implemented' || planning.status === 'unavailable') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning Applications</h2>
        <p className="text-gray-500 text-sm">Planning data coming soon.</p>
      </div>
    )
  }

  const data = planning.data

  // No applications — no reliable free national API exists for UK planning
  if (!data || data.application_count === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning Applications</h2>
        <p className="text-sm text-gray-600 mb-3">
          No planning application data is available for this postcode via public data sources.
        </p>
        <p className="text-xs text-gray-500">
          Planning applications in England are managed by individual local authorities. Check your
          local council&apos;s planning portal or{' '}
          <a
            href="https://www.planningportal.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Planning Portal
          </a>{' '}
          for local applications.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Planning Applications</h2>
      <p className="text-xs text-gray-400 mb-4">Within {data.radius_km} km</p>
      {planning.summary && (
        <p className="text-sm text-gray-700 mb-4">{planning.summary}</p>
      )}
      <div className="space-y-3">
        {data.applications.slice(0, 5).map((app) => (
          <div key={app.reference} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">{app.reference}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                {app.status}
              </span>
            </div>
            <p className="text-sm text-gray-800 line-clamp-2">{app.description}</p>
            {app.address && <p className="text-xs text-gray-400 mt-1">{app.address}</p>}
          </div>
        ))}
      </div>
      {data.caveats.length > 0 && (
        <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
          {data.caveats[0]}
        </p>
      )}
    </div>
  )
}
