import { CrimeSummary, SectionStatus } from '@/lib/api'

interface Props {
  crime: CrimeSummary | null
  status: SectionStatus
}

export function CrimeTrendFragment({ crime, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Crime</p>
        <p className="text-sm text-gray-500">Crime data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !crime) {
    return (
      <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Crime</p>
        <p className="text-sm text-gray-500">Crime data temporarily unavailable.</p>
      </div>
    )
  }

  const { summary, total_incidents, period_months, top_categories, source, caveats } = crime
  const topFive = top_categories.slice(0, 5)

  return (
    <div className="max-w-[480px] bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crime</p>

      {summary && <p className="text-sm text-gray-700">{summary}</p>}

      <p className="text-sm text-gray-700">
        <span className="font-semibold text-gray-900 text-base">{total_incidents.toLocaleString()}</span>
        {' '}reported incidents over {period_months} months
      </p>

      {topFive.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Top categories</p>
          <ul className="space-y-1">
            {topFive.map((cat) => (
              <li key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize">{cat.category.replace(/-/g, ' ')}</span>
                <span className="font-medium text-gray-900 tabular-nums">{cat.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caveats.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            Data notes ({caveats.length})
          </summary>
          <ul className="mt-1 space-y-0.5">
            {caveats.map((c, i) => (
              <li key={i} className="text-xs text-gray-400">{c}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-gray-400">Source: {source}</p>
    </div>
  )
}
