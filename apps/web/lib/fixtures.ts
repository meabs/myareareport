import type { Area, CrimeSummary, FloodRiskSummary, PlanningSummary } from './api'

export const fixtureArea: Area = {
  postcode: "CH1 4AB",
  latitude: 53.191,
  longitude: -2.891,
  admin_district: "Cheshire West and Chester",
  admin_county: "Cheshire",
  region: "North West",
  country: "England",
  source: "postcodes.io",
}

export const fixtureCrimeSummary: CrimeSummary = {
  postcode: "CH1 4AB",
  period_months: 12,
  total_incidents: 183,
  top_categories: [
    { category: "Anti-social behaviour", count: 42 },
    { category: "Vehicle crime", count: 31 },
    { category: "Other theft", count: 24 },
  ],
  monthly_trend: [
    { month: "2025-05", count: 16 },
    { month: "2025-06", count: 14 },
    { month: "2025-07", count: 18 },
    { month: "2025-08", count: 15 },
    { month: "2025-09", count: 13 },
    { month: "2025-10", count: 17 },
    { month: "2025-11", count: 14 },
    { month: "2025-12", count: 12 },
    { month: "2026-01", count: 16 },
    { month: "2026-02", count: 15 },
    { month: "2026-03", count: 17 },
    { month: "2026-04", count: 16 },
  ],
  source: "police.uk",
  updated_frequency: "Monthly",
  caveats: [
    "Crime data is published monthly and may lag behind current conditions.",
    "Reported incidents reflect reporting behaviour and policing patterns.",
    "This data should not be used as a real-time safety indicator.",
  ],
  summary: "Reported crime levels were broadly stable over the selected period. The most common reported categories were Anti-social behaviour and Vehicle crime.",
}

export const fixtureFloodRisk: FloodRiskSummary = {
  postcode: "CH1 4AB",
  current_warnings: [],
  nearest_stations: [
    { label: "River Dee at Chester", distance_km: 1.8, latest_level_m: 2.1, timestamp: "2026-05-17T10:30:00Z" },
  ],
  summary: "No current flood warnings were found near this postcode.",
  source: "Environment Agency",
  caveats: [
    "Flood data can change quickly.",
    "Use official flood warning services for current emergency information.",
    "This service is not insurance or emergency advice.",
  ],
}

export const fixturePlanningSummary: PlanningSummary = {
  postcode: "CH1 4AB",
  radius_km: 2,
  application_count: 3,
  applications: [
    { reference: "23/01234/FUL", status: "Pending", description: "Residential development of 12 dwellings", address: "Example Road, Chester", distance_km: 1.2, decision_date: null, source: "planning.data.gov.uk" },
    { reference: "23/05678/OUT", status: "Approved", description: "Outline planning: mixed use development", address: "High Street, Chester", distance_km: 0.8, decision_date: "2024-03-15", source: "planning.data.gov.uk" },
  ],
  summary: "3 nearby planning applications were found within 2 km.",
  caveats: [
    "Planning data coverage varies by local authority.",
    "Some applications may be missing or delayed depending on council publication practices.",
  ],
}

// Second area for comparison (Manchester)
export const fixtureAreaB: Area = {
  postcode: "M1 1AA",
  latitude: 53.479,
  longitude: -2.245,
  admin_district: "Manchester",
  admin_county: null,
  region: "North West",
  country: "England",
  source: "postcodes.io",
}

export const fixtureCrimeSummaryB: CrimeSummary = {
  ...fixtureCrimeSummary,
  postcode: "M1 1AA",
  total_incidents: 312,
  summary: "Reported incidents increased over the selected period. The most common reported categories were Anti-social behaviour and Vehicle crime.",
}
