import Link from 'next/link'
import {
  fixtureArea,
  fixtureCrimeSummary,
  fixtureFloodRisk,
  fixturePlanningSummary,
  fixtureAreaB,
  fixtureCrimeSummaryB,
} from '@/lib/fixtures'
import { InlineAreaSummary } from '@/components/fragments/InlineAreaSummary'
import { CrimeTrendFragment } from '@/components/fragments/CrimeTrendFragment'
import { FloodRiskFragment } from '@/components/fragments/FloodRiskFragment'
import { PlanningApplicationsFragment } from '@/components/fragments/PlanningApplicationsFragment'
import { AreaComparisonFragment } from '@/components/fragments/AreaComparisonFragment'

function FragmentSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</h2>
      {children}
    </section>
  )
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fragment Demo</h1>
            <p className="text-sm text-gray-500 mt-0.5">MCP / App SDK UI fragments — CH1 4AB fixture data</p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Home
          </Link>
        </div>

        <FragmentSection label="Inline Area Summary">
          <InlineAreaSummary area={fixtureArea} status="available" />
        </FragmentSection>

        <FragmentSection label="Crime Trend">
          <CrimeTrendFragment crime={fixtureCrimeSummary} status="available" />
        </FragmentSection>

        <FragmentSection label="Crime Trend — unavailable state">
          <CrimeTrendFragment crime={null} status="unavailable" />
        </FragmentSection>

        <FragmentSection label="Crime Trend — not implemented state">
          <CrimeTrendFragment crime={null} status="not_implemented" />
        </FragmentSection>

        <FragmentSection label="Flood">
          <FloodRiskFragment flood={fixtureFloodRisk} status="available" />
        </FragmentSection>

        <FragmentSection label="Flood — not implemented state">
          <FloodRiskFragment flood={null} status="not_implemented" />
        </FragmentSection>

        <FragmentSection label="Flood — unavailable state">
          <FloodRiskFragment flood={null} status="unavailable" />
        </FragmentSection>

        <FragmentSection label="Planning Applications">
          <PlanningApplicationsFragment planning={fixturePlanningSummary} status="available" />
        </FragmentSection>

        <FragmentSection label="Planning Applications — not implemented state">
          <PlanningApplicationsFragment planning={null} status="not_implemented" />
        </FragmentSection>

        <FragmentSection label="Area Comparison">
          <AreaComparisonFragment
            areaA={fixtureArea}
            crimeA={fixtureCrimeSummary}
            areaB={fixtureAreaB}
            crimeB={fixtureCrimeSummaryB}
            floodA={fixtureFloodRisk}
            floodB={null}
          />
        </FragmentSection>

        <footer className="pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Fixture data only. Not for emergency, legal, or property decisions.
          </p>
        </footer>
      </div>
    </main>
  )
}
