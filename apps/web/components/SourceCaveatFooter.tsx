import { SourceRef } from '@/lib/api'

export default function SourceCaveatFooter({ sources }: { sources: SourceRef[] }) {
  return (
    <footer className="mt-8 border-t border-gray-200 pt-6 pb-10">
      {sources.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data sources</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {sources.map((s) => (
              <li key={s.name}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400">
        Data may be delayed or incomplete. Not for emergency, legal, or property decisions.
      </p>
    </footer>
  )
}
