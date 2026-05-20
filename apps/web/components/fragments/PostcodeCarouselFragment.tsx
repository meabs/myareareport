export interface CarouselItem {
  postcode: string
  admin_district: string | null
  region: string | null
  total_incidents: number | null
  crime_summary: string | null
  flood_warnings: number | null
  planning_count: number | null
}

interface Props {
  items: CarouselItem[]
}

export function PostcodeCarouselFragment({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="max-w-[480px] bg-oai-surface border border-oai-line rounded-oai p-4">
        <p className="text-sm text-oai-caption">No postcodes to compare.</p>
      </div>
    )
  }

  const useGrid = items.length >= 4
  const listClass = useGrid ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'

  return (
    <div className="max-w-[480px]" role="list" aria-label="Postcode comparison">
      <p className="text-xs font-semibold text-oai-caption uppercase tracking-wide mb-2">
        Postcode comparison
      </p>
      <div className={listClass}>
        {items.map((item) => (
          <article
            key={item.postcode}
            role="listitem"
            className="bg-oai-surface border border-oai-line rounded-oai p-3 space-y-2"
          >
            <p className="font-bold text-oai-primary text-base">{item.postcode}</p>
            <p className="text-xs text-oai-caption leading-snug">
              {[item.admin_district, item.region].filter(Boolean).join(', ')}
            </p>
            {item.total_incidents != null && (
              <p className="text-sm text-oai-secondary">
                <span className="font-semibold text-oai-primary">{item.total_incidents.toLocaleString()}</span>
                {' '}reported incidents
              </p>
            )}
            {item.flood_warnings != null && (
              <p className="text-xs text-oai-secondary">
                {item.flood_warnings} active flood warning{item.flood_warnings !== 1 ? 's' : ''}
              </p>
            )}
            {item.planning_count != null && (
              <p className="text-xs text-oai-secondary">
                {item.planning_count} planning application{item.planning_count !== 1 ? 's' : ''} nearby
              </p>
            )}
            {item.crime_summary && (
              <p className="text-xs text-oai-caption line-clamp-2">{item.crime_summary}</p>
            )}
          </article>
        ))}
      </div>
      <p className="text-xs text-oai-caption mt-2">
        Public data only. Not for property or personal safety decisions.
      </p>
    </div>
  )
}
