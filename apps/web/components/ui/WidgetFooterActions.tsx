'use client'

export interface WidgetAction {
  label: string
  /** href triggers a fullscreen expand request to the Apps SDK host */
  href?: string
  /** message posts suggested text back to the chat */
  message?: string
  variant?: 'primary' | 'secondary'
}

interface Props {
  actions?: WidgetAction[]
  followups?: string[]
}

function postToParent(type: string, payload: Record<string, string>) {
  try {
    window.parent?.postMessage({ type, ...payload }, '*')
  } catch {
    // outside iframe — no-op
  }
}

function ActionButton({ action }: { action: WidgetAction }) {
  const isPrimary = action.variant !== 'secondary'
  const base = 'text-sm font-medium py-1.5 px-3 rounded-oai transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oai-brand'
  const cls = isPrimary
    ? `${base} bg-oai-brand text-white`
    : `${base} bg-oai-surface border border-oai-line text-oai-primary`

  function handleClick() {
    if (action.href) {
      // Request Apps SDK fullscreen expand; fall back to new tab
      postToParent('widget_expand', { url: action.href })
      setTimeout(() => window.open(action.href, '_blank', 'noopener,noreferrer'), 150)
    } else if (action.message) {
      postToParent('send_message', { text: action.message })
    }
  }

  return (
    <button type="button" className={cls} onClick={handleClick}>
      {action.label}
    </button>
  )
}

export function WidgetFooterActions({ actions = [], followups = [] }: Props) {
  if (actions.length === 0 && followups.length === 0) return null

  return (
    <div className="max-w-[480px] mt-2 space-y-2">
      {actions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {actions.slice(0, 2).map((a) => (
            <ActionButton key={a.label} action={a} />
          ))}
        </div>
      )}
      {followups.length > 0 && (
        // U5: follow-up suggestion chips from MCP suggested_followups
        <div className="flex flex-wrap gap-2" aria-label="Suggested follow-ups">
          {followups.map((f, i) => (
            <button
              key={i}
              type="button"
              className="text-xs bg-oai-brand-muted text-oai-brand px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oai-brand"
              onClick={() => postToParent('send_message', { text: f })}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
