import { StopSearchFragment } from '@/components/fragments/StopSearchFragment'
import { fetchStopSearchWidget } from '@/lib/widget-data'

interface Props {
  searchParams: Promise<{ postcode?: string; months?: string }>
}

export default async function StopSearchWidgetPage({ searchParams }: Props) {
  const { postcode, months: monthsStr } = await searchParams
  if (!postcode?.trim()) {
    return (
      <p className="text-sm text-gray-500 max-w-[480px]">
        Ask for a UK postcode — for example: <em>&ldquo;stop and search data for CH1 4AB&rdquo;</em>
      </p>
    )
  }

  const months = monthsStr ? Math.min(12, Math.max(1, parseInt(monthsStr, 10) || 3)) : 3
  const data = await fetchStopSearchWidget(postcode.trim(), months)

  return <StopSearchFragment data={data} status={data ? 'available' : 'unavailable'} />
}
