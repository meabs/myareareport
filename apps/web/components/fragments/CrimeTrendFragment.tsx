import { CrimeSummary, SectionStatus } from '@/lib/api'
import { ShieldIcon } from '@/components/ui/WidgetIcons'
import { WidgetCaveatFooter } from '@/components/fragments/WidgetCaveatFooter'

interface Props {
  crime: CrimeSummary | null
  status: SectionStatus
}

export function CrimeTrendFragment({ crime, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Crime</h2>
        </div>
        <p className="text-sm text-oai-caption">Crime data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !crime) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Crime</h2>
        </div>
        <p className="text-sm text-oai-caption">Crime data temporarily unavailable.</p>
      </div>
    )
  }

  const { postcode, summary, total_incidents, period_months, top_categories, source, caveats } = crime
  const topThree = top_categories.slice(0, 3)
  const remaining = top_categories.length - topThree.length

  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">Crime — {postcode}</h2>
      </div>

      {summary && <p className="text-sm text-oai-secondary">{summary}</p>}

      <p className="text-sm text-oai-secondary">
        <span className="font-semibold text-oai-primary text-base">{total_incidents.toLocaleString()}</span>
        {' '}reported incidents over {period_months} months
      </p>

      {topThree.length > 0 && (
        <div>
          <p className="text-xs font-medium text-oai-caption mb-1.5">Top categories</p>
          <ul className="space-y-1">
            {topThree.map((cat) => (
              <li key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-oai-secondary capitalize">{cat.category.replace(/-/g, ' ')}</span>
                <span className="font-medium text-oai-primary tabular-nums">{cat.count}</span>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <p className="text-xs text-oai-caption mt-1.5">+{remaining} more categories</p>
          )}
        </div>
      )}

      <WidgetCaveatFooter caveats={caveats} source={source} />
    </div>
  )
}
