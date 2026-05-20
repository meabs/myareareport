import { HousePricesSection } from '@/lib/api'

function formatPrice(p: number): string {
  return '£' + p.toLocaleString('en-GB')
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const TYPE_COLOURS: Record<string, string> = {
  Detached: 'bg-blue-100 text-blue-700',
  'Semi-Detached': 'bg-purple-100 text-purple-700',
  Terraced: 'bg-amber-100 text-amber-700',
  Flat: 'bg-green-100 text-green-700',
  Other: 'bg-gray-100 text-gray-600',
}

export default function HousePricesCard({ housePrices }: { housePrices: HousePricesSection }) {
  if (housePrices.status !== 'available' || !housePrices.data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">House Prices</h2>
        <p className="text-gray-500 text-sm">
          {housePrices.status === 'unavailable'
            ? 'House price data temporarily unavailable.'
            : 'House price data coming soon.'}
        </p>
      </div>
    )
  }

  const { transactions, average_price, summary } = housePrices.data
  const recent = transactions.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">House Prices</h2>
      {summary && <p className="text-sm text-gray-700 mb-4">{summary}</p>}

      {average_price !== null && (
        <div className="mb-4">
          <span className="text-2xl font-bold text-gray-900">{formatPrice(average_price)}</span>
          <span className="text-sm text-gray-500 ml-2">average ({transactions.length} sale{transactions.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent sales</h3>
          <ul className="space-y-2">
            {recent.map((t, i) => {
              const colourClass = TYPE_COLOURS[t.property_type] ?? TYPE_COLOURS['Other']
              return (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-800 truncate">{t.address}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${colourClass}`}>
                        {t.property_type}
                      </span>
                      <span className="text-gray-400 text-xs">{formatDate(t.date)}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums shrink-0">{formatPrice(t.price)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {transactions.length === 0 && (
        <p className="text-sm text-gray-500">No recent sales found for this postcode.</p>
      )}

      <p className="text-xs text-gray-400 mt-4">Source: HM Land Registry Price Paid Data</p>
    </div>
  )
}
