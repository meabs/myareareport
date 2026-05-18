export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" role="status" aria-label="Loading" />
        <p className="text-gray-600 text-sm">Loading area report&hellip;</p>
      </div>
    </div>
  )
}
