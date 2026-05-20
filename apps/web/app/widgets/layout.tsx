/** Minimal padding for ChatGPT / MCP iframe embeds (uses root layout html/body). */
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    // AC5: aria-live so assistive tech announces when widget content loads/updates
    <div className="p-1" aria-live="polite" aria-atomic="false">
      {children}
    </div>
  )
}
