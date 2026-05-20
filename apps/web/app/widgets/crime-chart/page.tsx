import CrimeTrendCard from '@/components/CrimeTrendCard'
import { fetchCrime } from '@/lib/widget-data'
import { decodeFollowups, decodePayload } from '@/lib/widget-data'
import { WidgetFooterActions } from '@/components/ui/WidgetFooterActions'
import type { CrimeSummary } from '@/lib/api'

interface Props {
  searchParams: Promise<{ postcode?: string; months?: string; d?: string; f?: string }>
}

export default async function CrimeChartWidgetPage({ searchParams }: Props) {
  const { postcode, months: monthsStr, d, f } = await searchParams

  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-oai-caption p-4 max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;crime trend chart for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const pc = postcode.trim()
  const months = monthsStr ? Math.min(12, Math.max(1, parseInt(monthsStr, 10) || 12)) : 12
  const followups = f ? decodeFollowups(f) : []

  // A2: use encoded payload if present, otherwise fetch
  let crime: CrimeSummary | null = d ? decodePayload<CrimeSummary>(d) : null
  if (!crime) crime = await fetchCrime(pc, months)

  // F3: fullscreen crime chart — use the full CrimeTrendCard with Recharts
  return (
    <div className="p-4 max-w-xl">
      <CrimeTrendCard crime={{ status: crime ? 'available' : 'unavailable', data: crime, summary: crime?.summary ?? null }} />
      <WidgetFooterActions
        followups={followups}
        actions={[
          { label: 'Compare with another postcode', message: `Compare crime for ${pc} with another postcode`, variant: 'secondary' },
        ]}
      />
    </div>
  )
}
