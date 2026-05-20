import { PlanningSummary, SectionStatus } from '@/lib/api'
import { FileTextIcon } from '@/components/ui/WidgetIcons'
import { WidgetCaveatFooter } from '@/components/fragments/WidgetCaveatFooter'

interface Props {
  planning: PlanningSummary | null
  status: SectionStatus
}

const STATUS_STYLES: Record<string, string> = {
  Approved:  'bg-oai-ok-bg text-oai-ok',
  Granted:   'bg-oai-ok-bg text-oai-ok',
  Permitted: 'bg-oai-ok-bg text-oai-ok',
  Refused:   'bg-oai-alert-bg text-oai-alert',
  Rejected:  'bg-oai-alert-bg text-oai-alert',
  Withdrawn: 'bg-oai-alert-bg text-oai-alert',
  Pending:   'bg-oai-warn-bg text-oai-warn',
  Submitted: 'bg-oai-warn-bg text-oai-warn',
  Received:  'bg-oai-warn-bg text-oai-warn',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-oai-muted text-oai-caption'
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-oai-sm ${cls}`}>
      {status}
    </span>
  )
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export function PlanningApplicationsFragment({ planning, status }: Props) {
  if (status === 'not_implemented') {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileTextIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Planning applications</h2>
        </div>
        <p className="text-sm text-oai-caption">Planning data coming soon.</p>
      </div>
    )
  }

  if (status !== 'available' || !planning) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileTextIcon className="w-4 h-4 text-oai-caption shrink-0" />
          <h2 className="text-sm font-semibold text-oai-primary">Planning applications</h2>
        </div>
        <p className="text-sm text-oai-caption">Planning data temporarily unavailable.</p>
      </div>
    )
  }

  const { postcode, summary, applications, application_count, caveats } = planning
  const shown = applications.slice(0, 3)
  const hiddenCount = application_count - shown.length

  return (
    <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileTextIcon className="w-4 h-4 text-oai-caption shrink-0" />
        <h2 className="text-sm font-semibold text-oai-primary">Planning near {postcode}</h2>
      </div>

      {summary && <p className="text-sm text-oai-secondary">{summary}</p>}

      {shown.length > 0 && (
        <ul className="divide-y divide-oai-line-muted">
          {shown.map((app) => (
            <li key={app.reference} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-oai-caption">{app.reference}</span>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-sm text-oai-secondary">{truncate(app.description, 60)}</p>
              {app.distance_km !== null && (
                <p className="text-xs text-oai-caption">{app.distance_km.toFixed(1)} km away</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="text-xs text-oai-caption">
          +{hiddenCount} more application{hiddenCount !== 1 ? 's' : ''} nearby
        </p>
      )}

      <WidgetCaveatFooter caveats={caveats} source="planning.data.gov.uk" />
    </div>
  )
}
