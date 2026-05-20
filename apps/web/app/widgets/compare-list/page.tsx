import { PostcodeCarouselFragment } from '@/components/fragments/PostcodeCarouselFragment'
import { fetchCompareList } from '@/lib/widget-data'

interface Props {
  searchParams: Promise<{ postcodes?: string }>
}

export default async function CompareListWidgetPage({ searchParams }: Props) {
  const { postcodes } = await searchParams
  if (!postcodes?.trim()) {
    return (
      <p className="text-sm text-gray-500 max-w-[480px]">
        Ask to compare a list of UK postcodes — for example: <em>&ldquo;compare CH1 4AB, M1 1AA, and SW1A 1AA&rdquo;</em>
      </p>
    )
  }

  const list = postcodes.split(',').map((p) => p.trim()).filter(Boolean)
  const items = await fetchCompareList(list)

  return <PostcodeCarouselFragment items={items} />
}
