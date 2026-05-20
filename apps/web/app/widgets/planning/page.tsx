import { PlanningApplicationsFragment } from '@/components/fragments/PlanningApplicationsFragment'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import { fetchPlanning, decodePayload, decodeFollowups } from '@/lib/widget-data'
import type { PlanningSummary } from '@/lib/api'

interface Props {
  searchParams: Promise<{ postcode?: string; radius_km?: string; d?: string; f?: string }>
}

export default async function PlanningWidgetPage({ searchParams }: Props) {
  const { postcode, radius_km: radiusStr, d, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;planning applications near CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const radius = radiusStr ? parseFloat(radiusStr) || 2 : 2
  const followups = f ? decodeFollowups(f) : []

  // A2: use encoded payload if present
  let planning: PlanningSummary | null = d ? decodePayload<PlanningSummary>(d) : null
  if (!planning) planning = await fetchPlanning(pc, radius)

  return (
    <>
      <PlanningApplicationsFragment planning={planning} status={planning ? 'available' : 'unavailable'} />
      <WidgetFooterActions
        followups={followups}
        actions={[
          { label: 'Show on map', href: `/widgets/map?postcode=${encodeURIComponent(pc)}`, variant: 'primary' },
        ]}
      />
    </>
  )
}
