import { PlaceholderSection } from '@/lib/api'

export default function PlanningApplicationsCard({ planning }: { planning: PlaceholderSection }) {
  if (planning.status === 'not_implemented') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning Applications</h2>
        <p className="text-gray-500 text-sm">Planning data coming soon.</p>
      </div>
    )
  }

  if (planning.status !== 'available') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning Applications</h2>
        <p className="text-gray-500 text-sm">Planning data temporarily unavailable.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Planning Applications</h2>
      {planning.summary && <p className="text-sm text-gray-700">{planning.summary}</p>}
    </div>
  )
}
