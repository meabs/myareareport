import { AreaComparisonFragment } from '@/components/fragments/AreaComparisonFragment'
import { fetchBriefing } from '@/lib/widget-data'

interface Props {
  searchParams: Promise<{ postcode_a?: string; postcode_b?: string }>
}

export default async function CompareWidgetPage({ searchParams }: Props) {
  const { postcode_a, postcode_b } = await searchParams
  if (!postcode_a?.trim() || !postcode_b?.trim()) {
    return (
      <p className="text-sm text-gray-500 max-w-[480px]">
        Ask to compare two UK postcodes — for example: <em>&ldquo;compare CH1 4AB with M1 1AA&rdquo;</em>
      </p>
    )
  }

  const [reportA, reportB] = await Promise.all([
    fetchBriefing(postcode_a.trim()),
    fetchBriefing(postcode_b.trim()),
  ])

  if (!reportA?.area.data || !reportB?.area.data) {
    return (
      <p className="text-sm text-gray-500 max-w-[480px]">
        One or both postcodes weren&apos;t recognised — check the format, e.g. <em>CH1 4AB</em>.
      </p>
    )
  }

  return (
    <AreaComparisonFragment
      areaA={reportA.area.data}
      crimeA={reportA.sections.crime.data}
      areaB={reportB.area.data}
      crimeB={reportB.sections.crime.data}
      floodA={reportA.sections.flood.data}
      floodB={reportB.sections.flood.data}
    />
  )
}
