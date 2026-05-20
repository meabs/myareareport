import {
  getReport,
  getStopSearch,
  type CrimeSummary,
  type FloodRiskSummary,
  type PlanningSummary,
  type Report,
  type SectionStatus,
  type StopSearchSummary,
} from '@/lib/api'
import type { CarouselItem } from '@/components/fragments/PostcodeCarouselFragment'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function fetchBriefing(postcode: string): Promise<Report | null> {
  return getReport(postcode)
}

export async function fetchStopSearchWidget(
  postcode: string,
  months: number,
): Promise<StopSearchSummary | null> {
  return getStopSearch(postcode, months)
}

export async function fetchCompareList(postcodes: string[]): Promise<CarouselItem[]> {
  const items: CarouselItem[] = []
  for (const pc of postcodes.slice(0, 5)) {
    const report = await getReport(pc.trim())
    if (!report?.area.data) continue
    const crime = report.sections.crime.data
    const flood = report.sections.flood.data
    items.push({
      postcode: report.postcode,
      admin_district: report.area.data.admin_district,
      region: report.area.data.region,
      total_incidents: crime?.total_incidents ?? null,
      crime_summary: report.sections.crime.summary,
      flood_warnings: flood ? flood.current_warnings.length : null,
      planning_count:
        report.sections.planning.status === 'available' && report.sections.planning.data
          ? (report.sections.planning.data as PlanningSummary).application_count
          : null,
    })
  }
  return items
}

export async function fetchCrime(postcode: string, months: number): Promise<CrimeSummary | null> {
  const res = await fetch(
    `${API_URL}/crime/${encodeURIComponent(postcode)}?months=${months}`,
    { cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}

export async function fetchFlood(postcode: string): Promise<FloodRiskSummary | null> {
  const res = await fetch(`${API_URL}/flood/${encodeURIComponent(postcode)}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function fetchPlanning(
  postcode: string,
  radiusKm: number,
): Promise<PlanningSummary | null> {
  const res = await fetch(
    `${API_URL}/planning/${encodeURIComponent(postcode)}?radius_km=${radiusKm}`,
    { cache: 'no-store' },
  )
  if (!res.ok) return null
  return res.json()
}

export function sectionToFragmentStatus(
  status: SectionStatus,
): 'available' | 'unavailable' | 'not_implemented' {
  if (status === 'available') return 'available'
  if (status === 'not_implemented') return 'not_implemented'
  return 'unavailable'
}

// A2: decode a base64url payload embedded by response_helpers._b64enc
export function decodePayload<T>(encoded: string): T | null {
  try {
    const padded = encoded + '=='.slice(0, (4 - (encoded.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T
  } catch {
    return null
  }
}

// U5: decode up to 2 follow-up suggestion strings
export function decodeFollowups(encoded: string): string[] {
  try {
    const result = decodePayload<string[]>(encoded)
    return Array.isArray(result) ? result.slice(0, 2) : []
  } catch {
    return []
  }
}
