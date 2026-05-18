export interface SourceRef { name: string; url: string }
export interface Area { postcode: string; latitude: number; longitude: number; admin_district: string | null; admin_county: string | null; region: string | null; country: string; source: string }
export interface CrimeCategorySummary { category: string; count: number }
export interface MonthlyCount { month: string; count: number }
export interface CrimeSummary { postcode: string; period_months: number; total_incidents: number; top_categories: CrimeCategorySummary[]; monthly_trend: MonthlyCount[]; source: string; caveats: string[]; summary: string | null }
export interface FloodWarning { severity: string; message: string; area: string; source: string }
export interface FloodStation { label: string; distance_km: number | null; latest_level_m: number | null; timestamp: string | null }
export interface FloodRiskSummary { postcode: string; current_warnings: FloodWarning[]; nearest_stations: FloodStation[]; summary: string; source: string; caveats: string[] }
export type SectionStatus = 'available' | 'unavailable' | 'not_implemented' | 'error' | 'empty'
export interface AreaSection { status: SectionStatus; data: Area | null }
export interface CrimeSection { status: SectionStatus; summary: string | null; data: CrimeSummary | null }
export interface FloodSection { status: SectionStatus; summary: string | null; data: FloodRiskSummary | null }
export interface PlaceholderSection { status: SectionStatus; summary: string | null; data: null }
export interface ReportSections { crime: CrimeSection; flood: FloodSection; planning: PlaceholderSection }
export interface Report { postcode: string; generated_at: string; area: AreaSection; sections: ReportSections; sources: SourceRef[] }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function getReport(postcode: string): Promise<Report | null> {
  const res = await fetch(`${API_URL}/report/${encodeURIComponent(postcode)}`, { next: { revalidate: 300 } })
  if (!res.ok) return null
  return res.json()
}
