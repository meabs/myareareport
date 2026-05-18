import { AreaSection } from '@/lib/api'

export default function AreaSummaryCard({ area }: { area: AreaSection }) {
  if (area.status !== 'available' || !area.data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Area</h2>
        <p className="text-gray-500 text-sm">Area data unavailable.</p>
      </div>
    )
  }

  const { postcode, admin_district, admin_county, region, country } = area.data

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Area</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-500 font-medium">Postcode</dt>
          <dd className="text-gray-900 mt-0.5">{postcode}</dd>
        </div>
        {admin_district && (
          <div>
            <dt className="text-gray-500 font-medium">District</dt>
            <dd className="text-gray-900 mt-0.5">{admin_district}</dd>
          </div>
        )}
        {admin_county && (
          <div>
            <dt className="text-gray-500 font-medium">County</dt>
            <dd className="text-gray-900 mt-0.5">{admin_county}</dd>
          </div>
        )}
        {region && (
          <div>
            <dt className="text-gray-500 font-medium">Region</dt>
            <dd className="text-gray-900 mt-0.5">{region}</dd>
          </div>
        )}
        <div>
          <dt className="text-gray-500 font-medium">Country</dt>
          <dd className="text-gray-900 mt-0.5">{country}</dd>
        </div>
      </dl>
    </div>
  )
}
