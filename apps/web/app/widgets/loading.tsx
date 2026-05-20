export default function WidgetLoading() {
  return (
    <div className="max-w-[480px] animate-pulse p-1">
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-5 w-36 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-4/6 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
