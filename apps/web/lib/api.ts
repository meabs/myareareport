export interface SourceRef { name: string; url: string }
export interface Area { postcode: string; latitude: number; longitude: number; admin_district: string | null; admin_county: string | null; region: string | null; country: string; source: string }
export interface CrimeCategorySummary { category: string; count: number }
export interface MonthlyCount { month: string; count: number }
export interface CrimeSummary { postcode: string; period_months: number; total_incidents: number; top_categories: CrimeCategorySummary[]; monthly_trend: MonthlyCount[]; source: string; updated_frequency?: string; caveats: string[]; summary: string | null }
export interface FloodWarning { severity: string; message: string; area: string; source: string }
export interface FloodStation { label: string; distance_km: number | null; latest_level_m: number | null; timestamp: string | null }
export interface RainfallGauge { label: string; distance_km: number | null; latest_mm: number | null; timestamp: string | null }
export interface FloodRiskSummary { postcode: string; current_warnings: FloodWarning[]; nearest_stations: FloodStation[]; rainfall_gauges: RainfallGauge[]; summary: string; source: string; caveats: string[] }
export interface PlanningApplication { reference: string; status: string; description: string; address: string; distance_km: number | null; decision_date: string | null; source: string }
export interface PlanningSummary { postcode: string; radius_km: number; application_count: number; applications: PlanningApplication[]; summary: string; caveats: string[] }
export interface HousePrice { address: string; price: number; date: string; property_type: string }
export interface HousePricesSummary { postcode: string; transactions: HousePrice[]; average_price: number | null; source: string; caveats: string[]; summary: string }
export interface AirQualityReading { parameter: string; value: number; unit: string; last_updated: string | null }
export interface AirQualityStation { name: string; distance_km: number | null; readings: AirQualityReading[] }
export interface AirQualitySummary { postcode: string; nearest_station: AirQualityStation | null; aqi_label: string; aqi_index: number | null; summary: string; source: string; caveats: string[] }
export type SectionStatus = 'available' | 'unavailable' | 'not_implemented' | 'error' | 'empty'
export interface AreaSection { status: SectionStatus; data: Area | null }
export interface CrimeSection { status: SectionStatus; summary: string | null; data: CrimeSummary | null }
export interface FloodSection { status: SectionStatus; summary: string | null; data: FloodRiskSummary | null }
export interface PlaceholderSection { status: SectionStatus; summary: string | null; data: null }
export interface HousePricesSection { status: SectionStatus; summary: string | null; data: HousePricesSummary | null }
export interface AirQualitySection { status: SectionStatus; summary: string | null; data: AirQualitySummary | null }
export interface ReportSections { crime: CrimeSection; flood: FloodSection; planning: PlaceholderSection; house_prices: HousePricesSection; air_quality: AirQualitySection }
export interface Report { postcode: string; generated_at: string; area: AreaSection; sections: ReportSections; sources: SourceRef[] }

export interface CrimeIncident {
  category: string
  latitude: number
  longitude: number
  street: string
  month: string
}

export interface CrimeIncidentList {
  postcode: string
  period_months: number
  total: number
  incidents: CrimeIncident[]
  source: string
}

export interface StopSearchRecord {
  type: string
  date: string
  latitude: number | null
  longitude: number | null
  gender: string | null
  age_range: string | null
  self_defined_ethnicity: string | null
  object_of_search: string | null
  outcome: string | null
}

export interface StopSearchSummary {
  postcode: string
  period_months: number
  total: number
  records: StopSearchRecord[]
  source: string
  caveats: string[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function getReport(postcode: string): Promise<Report | null> {
  const res = await fetch(`${API_URL}/report/${encodeURIComponent(postcode)}`, { next: { revalidate: 300 } })
  if (!res.ok) return null
  return res.json()
}

export async function getCrimeIncidents(postcode: string, months = 3): Promise<CrimeIncidentList | null> {
  const res = await fetch(`${API_URL}/crime/${encodeURIComponent(postcode)}/incidents?months=${months}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function getStopSearch(postcode: string, months = 3): Promise<StopSearchSummary | null> {
  const res = await fetch(`${API_URL}/stop-search/${encodeURIComponent(postcode)}?months=${months}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}
