export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Use</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">What this service is</h2>
        <p className="text-gray-700 leading-relaxed">
          MyAreaReport provides structured UK area reports using public datasets. It is a public
          informational tool.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">What this service is not</h2>
        <p className="text-gray-700 leading-relaxed">
          MyAreaReport is not professional advice. It is not emergency advice. It is not legal
          advice. It is not insurance advice. It is not a property valuation tool.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Data accuracy</h2>
        <p className="text-gray-700 leading-relaxed">
          Data may be incomplete, delayed, or inaccurate depending on the source. We do not
          guarantee accuracy or completeness.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Availability</h2>
        <p className="text-gray-700 leading-relaxed">
          Service availability is not guaranteed. Data providers may be temporarily unavailable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Acceptable use</h2>
        <p className="text-gray-700 leading-relaxed">
          Do not use this service for automated bulk lookups without permission. Do not attempt to
          circumvent rate limiting.
        </p>
      </section>
    </main>
  )
}
