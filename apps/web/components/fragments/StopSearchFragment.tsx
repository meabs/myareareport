import { StopSearchSummary } from '@/lib/api'
import { UsersIcon } from '@/components/ui/WidgetIcons'
import { WidgetCaveatFooter } from '@/components/fragments/WidgetCaveatFooter'

interface Props {
  data: StopSearchSummary | null
  status: 'available' | 'unavailable'
}

export function StopSearchFragment({ data, status }: Props) {
  if (status !== 'available' || !data) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <UsersIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Stop and search</h2>
        </div>
        <p className="text-sm text-oai-caption">Stop and search data temporarily unavailable.</p>
      </div>
    )
  }

  const { postcode, period_months, total, records, source, caveats } = data
  const recent = records.slice(0, 3)

  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UsersIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">Stop and search — {postcode}</h2>
      </div>

      <p className="text-xs font-medium text-oai-warn bg-oai-warn-bg rounded-oai-sm px-2 py-1">
        A stop or search is not an indication of guilt. Do not use to profile areas or people.
      </p>

      <p className="text-sm text-oai-secondary">
        <span className="font-semibold text-oai-primary text-base">{total.toLocaleString()}</span>
        {' '}recorded stops over {period_months} month{period_months !== 1 ? 's' : ''}
      </p>

      {recent.length > 0 && (
        <ul className="divide-y divide-oai-line-muted">
          {recent.map((r, i) => (
            <li key={i} className="py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-oai-secondary">
                {r.type}
                {r.object_of_search && (
                  <span className="text-oai-caption font-normal"> — {r.object_of_search}</span>
                )}
              </p>
              <p className="text-xs text-oai-caption mt-0.5">{r.date}</p>
            </li>
          ))}
        </ul>
      )}

      <WidgetCaveatFooter caveats={caveats} source={source} />
    </div>
  )
}
