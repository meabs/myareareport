'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { CrimeSection } from '@/lib/api'

function formatMonth(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function CrimeTrendCard({ crime }: { crime: CrimeSection }) {
  if (crime.status !== 'available' || !crime.data) {
    const message = crime.summary ?? 'Crime data not available.'
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Crime</h2>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    )
  }

  const { summary, total_incidents, top_categories, period_months, monthly_trend } = crime.data
  const topFive = top_categories.slice(0, 5)

  const chartData = monthly_trend.map((m) => ({
    month: formatMonth(m.month),
    incidents: m.count,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Crime</h2>
      <p className="text-xs text-gray-400 mb-4">Last {period_months} months · Source: police.uk</p>

      {summary && <p className="text-sm text-gray-700 mb-5">{summary}</p>}

      <div className="mb-5">
        <span className="text-2xl font-bold text-gray-900">{total_incidents.toLocaleString()}</span>
        <span className="text-sm text-gray-500 ml-2">total incidents reported</span>
      </div>

      {chartData.length > 1 && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Monthly trend
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [value, 'Incidents']}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar dataKey="incidents" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {topFive.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Top categories
          </h3>
          <ul className="space-y-2">
            {topFive.map((cat) => {
              const pct = total_incidents > 0 ? Math.round((cat.count / total_incidents) * 100) : 0
              return (
                <li key={cat.category} className="text-sm">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-gray-700 capitalize">{cat.category.replace(/-/g, ' ')}</span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {cat.count} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 border-t border-gray-100 pt-3">
        Reported incidents reflect reporting behaviour and policing patterns, not actual crime rates.
        Not a safety indicator.
      </p>
    </div>
  )
}
