export default function DataSourcesPage() {
  const sources = [
    {
      name: 'postcodes.io',
      purpose: 'Postcode to location lookup',
      frequency: 'Real-time',
      url: 'https://postcodes.io',
    },
    {
      name: 'data.police.uk',
      purpose: 'Reported crime statistics',
      frequency: 'Monthly',
      url: 'https://data.police.uk',
    },
    {
      name: 'Environment Agency flood monitoring',
      purpose: 'Flood warnings and river levels',
      frequency: 'Varies',
      url: 'https://environment.data.gov.uk/flood-monitoring',
    },
    {
      name: 'planning.data.gov.uk',
      purpose: 'Planning applications',
      frequency: 'Varies',
      url: 'https://www.planning.data.gov.uk',
    },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Sources</h1>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 pr-4 font-semibold text-gray-700">Source</th>
              <th className="text-left py-3 pr-4 font-semibold text-gray-700">What we use it for</th>
              <th className="text-left py-3 pr-4 font-semibold text-gray-700">Update frequency</th>
              <th className="text-left py-3 font-semibold text-gray-700">URL</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.name} className="border-b border-gray-100">
                <td className="py-3 pr-4 text-gray-900">{source.name}</td>
                <td className="py-3 pr-4 text-gray-700">{source.purpose}</td>
                <td className="py-3 pr-4 text-gray-700">{source.frequency}</td>
                <td className="py-3">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {source.url}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">
        Data coverage varies by local authority and provider. Some areas may have missing or delayed
        data.
      </p>
    </main>
  )
}
