import PostcodeSearch from '@/components/PostcodeSearch'

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">MyAreaReport</h1>
          <p className="text-lg text-gray-600">Public area information for any UK postcode.</p>
        </div>
        <PostcodeSearch />
      </div>
      <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-200">
        Public data only. Not emergency, legal, or insurance advice.
      </footer>
    </main>
  )
}
