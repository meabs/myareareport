import { CrimeSection } from '@/lib/api'

export default function CrimeTrendCard({ crime }: { crime: CrimeSection }) {
  if (crime.status !== 'available' || !crime.data) {
    const message = crime.summary ?? 'Crime data not available.'
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Crime</h2>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    )
  }

  const { summary, total_incidents, top_categories, period_months } = crime.data
  const topFive = top_categories.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Crime</h2>
      <p className="text-xs text-gray-400 mb-4">Last {period_months} months</p>
      {summary && <p className="text-sm text-gray-700 mb-4">{summary}</p>}
      <div className="mb-4">
        <span className="text-2xl font-bold text-gray-900">{total_incidents.toLocaleString()}</span>
        <span className="text-sm text-gray-500 ml-2">total incidents reported</span>
      </div>
      {topFive.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top categories</h3>
          <ul className="space-y-2">
            {topFive.map((cat) => (
              <li key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize">{cat.category.replace(/-/g, ' ')}</span>
                <span className="font-medium text-gray-900 tabular-nums">{cat.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
