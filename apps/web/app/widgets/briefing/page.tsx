import { AreaBriefingFragment } from '@/components/fragments/AreaBriefingFragment'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import { fetchBriefing, decodeFollowups } from '@/lib/widget-data'

interface Props {
  searchParams: Promise<{ postcode?: string; f?: string }>
}

export default async function BriefingWidgetPage({ searchParams }: Props) {
  const { postcode, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;area briefing for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const followups = f ? decodeFollowups(f) : []
  const report = await fetchBriefing(pc)

  if (!report) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Postcode <strong>{pc}</strong> wasn&apos;t recognised or data is temporarily unavailable.
        Try another postcode, e.g. <em>SW1A 1AA</em>.
      </p>
    )
  }

  const planningSection = report.sections.planning as {
    status: typeof report.sections.crime.status
    summary: string | null
    data: import('@/lib/api').PlanningSummary | null
  }

  return (
    <>
      <AreaBriefingFragment
        area={report.area.data}
        crime={report.sections.crime}
        flood={report.sections.flood}
        planning={planningSection}
      />
      {/* U10: map and compare CTAs on briefing card */}
      <WidgetFooterActions
        followups={followups}
        actions={[
          { label: 'Show on map', href: `/widgets/map?postcode=${encodeURIComponent(pc)}`, variant: 'primary' },
          { label: 'Compare', message: `Compare ${pc} with another postcode`, variant: 'secondary' },
        ]}
      />
    </>
  )
}
