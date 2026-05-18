export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">What we collect</h2>
        <p className="text-gray-700 leading-relaxed">
          No account is required to use MyAreaReport. Postcode searches are processed to return
          reports and are not stored permanently. Server logs are used for reliability and abuse
          prevention. We do not intentionally collect special category data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Sentry</h2>
        <p className="text-gray-700 leading-relaxed">
          Technical error data may be sent to Sentry for reliability monitoring. No personal data
          is intentionally forwarded to Sentry.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Your data</h2>
        <p className="text-gray-700 leading-relaxed">
          We do not sell, rent, or share user data with third parties for marketing. No user
          profiles are created.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Cookies</h2>
        <p className="text-gray-700 leading-relaxed">
          We do not use tracking cookies or analytics cookies in V1.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For questions, contact:{' '}
          <a href="mailto:privacy@myareareport.com" className="text-blue-600 hover:underline">
            privacy@myareareport.com
          </a>
        </p>
      </section>
    </main>
  )
}
