import { FloodRiskFragment } from '@/components/fragments/FloodRiskFragment'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import { fetchFlood, decodePayload, decodeFollowups } from '@/lib/widget-data'
import type { FloodRiskSummary } from '@/lib/api'

interface Props {
  searchParams: Promise<{ postcode?: string; d?: string; f?: string }>
}

export default async function FloodWidgetPage({ searchParams }: Props) {
  const { postcode, d, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;flood risk for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const followups = f ? decodeFollowups(f) : []

  // A2: use encoded payload if present
  let flood: FloodRiskSummary | null = d ? decodePayload<FloodRiskSummary>(d) : null
  if (!flood) flood = await fetchFlood(pc)

  return (
    <>
      <FloodRiskFragment flood={flood} status={flood ? 'available' : 'unavailable'} />
      <WidgetFooterActions
        followups={followups}
        actions={[
          { label: 'Show on map', href: `/widgets/map?postcode=${encodeURIComponent(pc)}`, variant: 'primary' },
        ]}
      />
    </>
  )
}
