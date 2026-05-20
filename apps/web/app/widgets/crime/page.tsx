import { CrimeTrendFragment } from '@/components/fragments/CrimeTrendFragment'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import { fetchCrime, decodePayload, decodeFollowups } from '@/lib/widget-data'
import type { CrimeSummary } from '@/lib/api'

interface Props {
  searchParams: Promise<{ postcode?: string; months?: string; d?: string; f?: string }>
}

export default async function CrimeWidgetPage({ searchParams }: Props) {
  const { postcode, months: monthsStr, d, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;crime stats for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const months = monthsStr ? Math.min(12, Math.max(1, parseInt(monthsStr, 10) || 12)) : 12
  const followups = f ? decodeFollowups(f) : []

  // A2: use encoded payload from MCP widget_url if present, else fetch
  let crime: CrimeSummary | null = d ? decodePayload<CrimeSummary>(d) : null
  if (!crime) crime = await fetchCrime(pc, months)

  return (
    <>
      <CrimeTrendFragment crime={crime} status={crime ? 'available' : 'unavailable'} />
      {/* U10: expand to fullscreen chart; U5: followup chips */}
      <WidgetFooterActions
        followups={followups}
        actions={[
          { label: 'Show crime chart', href: `/widgets/crime-chart?postcode=${encodeURIComponent(pc)}&months=${months}${d ? `&d=${d}` : ''}`, variant: 'primary' },
          { label: 'Compare', message: `Compare crime for ${pc} with another postcode`, variant: 'secondary' },
        ]}
      />
    </>
  )
}
