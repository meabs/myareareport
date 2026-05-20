interface Props {
  caveats: string[]
  source?: string
}

export function WidgetCaveatFooter({ caveats, source }: Props) {
  if (caveats.length === 0 && !source) return null
  return (
    <div className="space-y-1 pt-1">
      {caveats.length > 0 && (
        <details>
          <summary className="text-xs text-oai-caption cursor-pointer hover:text-oai-secondary select-none">
            Data notes ({caveats.length})
          </summary>
          <ul className="mt-1 space-y-0.5">
            {caveats.map((c, i) => (
              <li key={i} className="text-xs text-oai-caption">{c}</li>
            ))}
          </ul>
        </details>
      )}
      {source && <p className="text-xs text-oai-caption">Source: {source}</p>}
    </div>
  )
}
