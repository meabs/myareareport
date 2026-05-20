import { InlineAreaSummary } from '@/components/fragments/InlineAreaSummary'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import { getReport } from '@/lib/api'
import { decodeFollowups } from '@/lib/widget-data'

interface Props {
  searchParams: Promise<{ postcode?: string; f?: string }>
}

export default async function AreaWidgetPage({ searchParams }: Props) {
  const { postcode, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;area summary for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const followups = f ? decodeFollowups(f) : []
  const report = await getReport(pc)

  if (!report?.area.data) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Postcode <strong>{pc}</strong> wasn&apos;t recognised — check the format, e.g. <em>CH1 4AB</em>.
      </p>
    )
  }

  return (
    <>
      <InlineAreaSummary area={report.area.data} status="available" />
      {/* U10: primary CTA opens fullscreen map; secondary suggests compare */}
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
