# MyAreaReport — MCP App / UI Improvement Plan

**Date:** 2026-05-19  
**Scope:** ChatGPT inline widgets, MCP App integration, Codex plugin presentation  
**Audience:** Engineers and designers working on embed UI

This document lists UI improvements for MyAreaReport’s MCP App experience, grounded in a code review of `apps/web/components/fragments/`, `apps/web/app/widgets/`, and `apps/mcp/` against OpenAI’s guidance.

---

## Reference documentation

| Guide | URL | What we use it for |
|-------|-----|-------------------|
| Build plugins (Codex) | https://developers.openai.com/codex/plugins/build | Install-surface metadata, assets, marketplace presentation |
| UX principles (Apps SDK) | https://developers.openai.com/apps-sdk/concepts/ux-principles | Conversational fit, atomic tools, anti-patterns |
| UI guidelines (Apps SDK) | https://developers.openai.com/apps-sdk/concepts/ui-guidelines | Display modes, inline card rules, visual design system |
| Apps SDK UI (design system) | https://openai.github.io/apps-sdk-ui/ | Tokens, components, Figma library |
| Figma component library | https://www.figma.com/community/file/1625636989296445101 | Pre-code design |

Related project docs: [sub.md](./sub.md) (submission audit), [visibility-roadmap.md](./visibility-roadmap.md), [chatgpt-demo-script.md](./chatgpt-demo-script.md).

---

## Current state (baseline)

MyAreaReport uses a **hybrid hosted-widget** pattern:

1. MCP tools return JSON + `widget_url` (`apps/mcp/response_helpers.py`).
2. ChatGPT embeds the URL in an iframe (`apps/web/app/widgets/*`).
3. Widget pages **re-fetch** the REST API from query params (`apps/web/lib/widget-data.ts`).
4. Compact **fragments** render at `max-w-[480px]` for inline chat.

**What works well**

- Clear tool → widget route mapping (8 widgets, 9 tools).
- Consistent three-state pattern: `available` | `unavailable` | `not_implemented`.
- Compliance copy (caveats, no safety rankings, stop-search disclaimer).
- No logo inside widgets (ChatGPT appends branding — correct per UI guidelines).
- Plugin scaffold with `defaultPrompt`, `brandColor`, `.app.json`, `.mcp.json`.

**What blocks a native-feeling ChatGPT UI**

- No `@openai/apps-sdk-ui` or Apps SDK design tokens — custom Tailwind grays throughout.
- No MCP UI resource registration (`ui://` templates); URL iframe only.
- Tool payload is not passed to the widget (duplicate API calls, slower embed).
- No widget loading UI — iframe is blank until server render completes.
- Several patterns conflict with inline card rules (stacked cards, horizontal scroll, external links).
- Plugin install-surface assets (`composerIcon`, `logo`, `screenshots`) are missing.

---

## Improvement categories

Improvements are grouped by source guideline, then prioritised at the end.

---

## 1. MCP App architecture (foundation)

These are structural UI enablers — without them, polish on fragments has limited impact in ChatGPT.

| ID | Improvement | Why | Files / action |
|----|-------------|-----|----------------|
| A1 | **Register MCP UI resources per tool** | Native Apps SDK binding; host can hydrate widgets from tool output instead of URL-only embeds | `apps/mcp/server.py`, new `apps/mcp/ui/` templates; follow Apps SDK “Build your ChatGPT UI” |
| A2 | **Pass tool result into widget (avoid double fetch)** | Maintains chat rhythm; widget shows instantly with data the model already has | Encode a signed payload in `widget_url` query, or use Apps SDK bridge; update `widget-data.ts` to prefer passed data |
| A3 | **Map each tool to exactly one display template** | UX principle: atomic, model-friendly actions | Document and enforce 1:1 mapping (see § Tool ↔ widget matrix) |
| A4 | **Add `Content-Security-Policy` / `frame-ancestors` for embed allowlist** | Secure iframe hosting for ChatGPT origin | `apps/web/next.config.ts` |
| A5 | **Confirm display mode metadata on tool responses** | Host picks inline vs fullscreen correctly | MCP tool metadata: `displayMode: inline \| fullscreen` where applicable |

---

## 2. UX principles improvements

Source: [UX principles](https://developers.openai.com/apps-sdk/concepts/ux-principles)

### 2.1 Extract, don’t port

| ID | Improvement | Current issue | Recommendation |
|----|-------------|---------------|----------------|
| U1 | **Split `AreaBriefingFragment` into a single inline card** | Briefing stacks 4 separate bordered cards (area + crime + flood + planning) — reads like a mini dashboard, not one inline card | One card with a scannable summary block (postcode header + 3 one-line section rows). Deep detail stays in individual tool widgets (`/widgets/crime`, etc.) |
| U2 | **Keep full `/report` out of ChatGPT** | Report page has map, Recharts, house prices, air quality — long-form web UX | Map/charts only via **fullscreen** expand (see F1); never default inline embed of `/report/[postcode]` |
| U3 | **Prefer `briefing_for_postcode` OR atomic tools, not both inline at once** | Model may call briefing when user only asked about crime | Skill + tool descriptions should steer: single-topic question → single widget |

### 2.2 Design for conversational entry

| ID | Improvement | Current issue | Recommendation |
|----|-------------|---------------|----------------|
| U4 | **Empty / error states suggest what to ask** | Widget pages show plain “Missing postcode parameter” / “not found” (`widgets/*/page.tsx`) | Replace with conversational hints: *“Ask ChatGPT for a UK postcode, e.g. ‘crime in CH1 4AB’”* |
| U5 | **Surface `suggested_followups` in the card footer** | Follow-ups exist in MCP JSON only (`response_helpers.py`) | Optional footer chips (max 2) that post a message back via host — or static text the model can echo |
| U6 | **First-run onboarding via plugin `defaultPrompt`** | Prompts exist in `plugin.json` but widgets don’t reinforce them | Add one-line helper under widget chrome on demo/dev builds only |

### 2.3 Design for the ChatGPT environment

| ID | Improvement | Current issue | Recommendation |
|----|-------------|---------------|----------------|
| U7 | **Remove outbound links from inline cards** | `FloodRiskFragment.tsx` — “View official flood warnings” opens a new tab | Move link to model response / `shareable_summary`; inline card shows count + nearest station only |
| U8 | **Use conversation for confirmation, UI for structure** | Some caveats duplicated in card and chat | Keep one collapsible “Data notes” in card; full legal text in conversation footer only |
| U9 | **Minimise PII in shared cards** | Postcodes visible in shared chats | Acceptable for product; avoid adding names/addresses beyond planning snippets; truncate planning addresses more aggressively in embed mode |

### 2.4 Optimise for conversation, not navigation

| ID | Improvement | Current issue | Recommendation |
|----|-------------|---------------|----------------|
| U10 | **Add up to two primary actions per card** | All fragments have 0 CTAs — relies entirely on model | Examples: **Compare** (secondary), **Show on map** (primary → fullscreen). Actions trigger tool calls, not in-card routing |
| U11 | **No tabs, drill-ins, or multi-view cards** | Briefing + planning list feel like nested views | Planning: use carousel (see C2) or “Show N more” that triggers a new tool call |
| U12 | **`explain_dataset` text responses stay text-only** | Correct today — no widget | Keep text-only; do not add a widget for education tools |

### 2.5 UX checklist gaps to close

| Checklist item | Status | UI action |
|----------------|--------|-----------|
| End-to-end in-chat completion | Partial | A1–A2, production connector (ops) |
| Helpful UI only | Partial | U1 — briefing must not be a dashboard |
| Performance & responsiveness | Unknown | P1 — loading skeletons, slimmer compare payload |
| Platform fit | Low | U5, U10 — follow-ups and CTAs in card |

### 2.6 Anti-patterns to avoid

| Anti-pattern | Risk in codebase | Fix |
|--------------|------------------|-----|
| Long-form static content | Full report page | Keep embed-only fragments |
| Complex multi-step inline workflows | Briefing stack | U1 |
| Ads / upsells | None | — |
| Duplicating ChatGPT composer | None | — |
| Sensitive info in cards | Stop-search records | Keep disclaimers prominent; limit record detail in embed |

---

## 3. Display mode improvements

Source: [UI guidelines — Display modes](https://developers.openai.com/apps-sdk/concepts/ui-guidelines)

### 3.1 Inline card (default)

| ID | Improvement | Rule | Current | Action |
|----|-------------|------|---------|--------|
| C1 | **Add card titles** | Title when document-based | Section labels only (`text-xs uppercase`) | Top-level title per widget: e.g. “Crime — CH1 4AB”, “Flood warnings near YO1 9QN” |
| C2 | **Planning → inline carousel** | 3–8 items, image + metadata + optional CTA | Static list of 3 in `PlanningApplicationsFragment.tsx` | Refactor to carousel rows; cap at 8; “Show more” triggers tool with larger radius |
| C3 | **Fix nested card in briefing** | Single-purpose inline card | `AreaBriefingFragment` wraps `InlineAreaSummary` in another card | Flatten to one container |
| C4 | **No nested scrolling** | Card auto-fits content | `PostcodeCarouselFragment` uses `overflow-x-auto` | Use host-native carousel pattern or vertical stacked cards for ≤3 items; for 4+ use Apps SDK carousel component |
| C5 | **Limit metadata to 2–3 lines per item** | Carousel scannability | Carousel items can exceed 3 lines with crime summary | `line-clamp-2` on summary; move detail to chat |
| C6 | **“Show more” for long lists** | Inline card rule | Crime top-5 categories always shown | Show top 3 + “+N categories” text; model can ask for breakdown |

### 3.2 Fullscreen

| ID | Improvement | When to use | Action |
|----|-------------|-------------|--------|
| F1 | **Map in fullscreen only** | Rich media / exploration | New `/widgets/map?postcode=` fullscreen target; **Expand** control on area summary card |
| F2 | **Composer-aware layout** | Composer always visible in fullscreen | Map/chart UI: leave bottom safe area; no fixed footers blocking composer |
| F3 | **Crime trend chart in fullscreen** | Recharts too tall for inline | Inline: number + summary; fullscreen: `CrimeTrendCard` with chart |

### 3.3 Picture-in-picture

| ID | Improvement | Verdict |
|----|-------------|---------|
| PIP1 | **Do not implement PiP** | No ongoing session use case (games, live video). N/A for MyAreaReport. |

---

## 4. Visual design & design system

Source: [UI guidelines — Visual design](https://developers.openai.com/apps-sdk/concepts/ui-guidelines) and [Apps SDK UI](https://openai.github.io/apps-sdk-ui/)

### 4.1 Adopt Apps SDK UI (Tier 3 in roadmap — elevate to P1 for ChatGPT)

| ID | Improvement | Current | Action |
|----|-------------|---------|--------|
| V1 | **Install `@openai/apps-sdk-ui`** | `apps/web/package.json` has no Apps SDK packages | Add dependency; configure Tailwind preset / CSS variables per Apps SDK UI docs |
| V2 | **Replace hardcoded colors** | `bg-white`, `border-gray-200`, `text-gray-*`, `text-blue-600` in all fragments | Map to system tokens: text primary/secondary, border subtle, surface card |
| V3 | **Use `brandColor` (#2563EB) on primary buttons only** | `plugin.json` defines brand color; UI has blue links everywhere | Primary CTA buttons use brand; links use system link color |
| V4 | **Typography scale** | `InlineAreaSummary`: `text-2xl` postcode; carousel `text-lg` | Use body / body-small for embed; postcode as semibold body, not display size |
| V5 | **System font stack** | Tailwind defaults (OK on web, not token-aligned) | `font-sans` → Apps SDK `--font-sans` variables in `globals.css` |
| V6 | **Spacing grid** | Inconsistent `p-3` / `p-4`, `space-y-2` / `space-y-3` | Standardise on Apps SDK spacing scale (e.g. card padding `p-4`, gap `gap-3`) |
| V7 | **Corner radius** | `rounded-lg` / `rounded-xl` mixed | Single token: `rounded-[var(--radius-card)]` or Apps SDK `Card` component |
| V8 | **Status badges** | Custom gray pills in `PlanningApplicationsFragment` | Use Apps SDK `Badge` with semantic variants (neutral, warning for flood) |

### 4.2 Imagery & icons

| ID | Improvement | Action |
|----|-------------|--------|
| V9 | **Add contextual icons (monochrome, outlined)** | Section headers: map pin (area), shield (crime), water (flood), document (planning) — system-style SVGs, not colourful brand icons |
| V10 | **Carousel visuals** | UI guidelines: items should include image or visual. Use static map thumbnails (Mapbox static / OS placeholder) or category icons per planning type |
| V11 | **Enforced aspect ratios** | When adding images, use 16:9 or 1:1 per Apps SDK; `object-cover` in fixed containers |
| V12 | **Alt text on all images** | Required when V10 ships |

### 4.3 Widget chrome

| ID | Improvement | Current | Action |
|----|-------------|---------|--------|
| V13 | **Widget layout background** | Root layout `bg-gray-50`; widgets add `p-1` only | Transparent/widget background matching ChatGPT embed — avoid white-on-gray double border |
| V14 | **Remove duplicate borders** | Briefing nests bordered cards | Single outer border per inline surface |
| V15 | **Consistent footer component** | Caveat strings duplicated across fragments | Extract `WidgetCaveatFooter` using shared `CAVEAT_FOOTER` text from MCP layer |

---

## 5. Per-component improvements

| Component | File | Improvements |
|-----------|------|--------------|
| **InlineAreaSummary** | `components/fragments/InlineAreaSummary.tsx` | V4 typography; C1 title; F1 optional “Expand map” action; unavailable state with U4 hint |
| **AreaBriefingFragment** | `components/fragments/AreaBriefingFragment.tsx` | U1 single-card layout; C3 remove nesting; split from default inline for atomic tools |
| **CrimeTrendFragment** | `components/fragments/CrimeTrendFragment.tsx` | C6 truncate categories; V9 icon; collapsible caveats — verify keyboard a11y |
| **FloodRiskFragment** | `components/fragments/FloodRiskFragment.tsx` | U7 remove external link; badge for warning count (0 = neutral, >0 = warning variant) |
| **PlanningApplicationsFragment** | `components/fragments/PlanningApplicationsFragment.tsx` | C2 carousel refactor; V8 badges; truncate description to 60 chars in embed |
| **AreaComparisonFragment** | `components/fragments/AreaComparisonFragment.tsx` | C1 title “Comparing A vs B”; visual diff hint (not judgmental — e.g. higher/lower incident count with neutral wording); U10 “Compare another” CTA |
| **PostcodeCarouselFragment** | `components/fragments/PostcodeCarouselFragment.tsx` | C4 fix horizontal scroll; C5 line clamps; V10 thumbnails; enforce 3–8 items with message if fewer |
| **StopSearchFragment** | `components/fragments/StopSearchFragment.tsx` | Prominent disclaimer at top; reduce record list to 3 in embed; sensitive data minimisation |
| **Widget pages** | `app/widgets/*/page.tsx` | Shared `WidgetShell` with loading/error/success; U4 error copy |
| **Widget layout** | `app/widgets/layout.tsx` | V13 transparent background; optional `WidgetErrorBoundary` |

---

## 6. Loading, error & performance UI

| ID | Improvement | Current | Action |
|----|-------------|---------|--------|
| P1 | **Widget `loading.tsx` skeletons** | Only `/report` has loading UI | Add `app/widgets/loading.tsx` — pulse skeleton matching card layout (~480px) |
| P2 | **Stale-while-revalidate feel** | Blank iframe until RSC completes | If A2 implemented: render immediately from tool payload; skeleton only for secondary fetch |
| P3 | **Compare widgets performance** | `compare_areas` / carousel fetch multiple full reports | Show per-column skeletons; MCP slim comparison endpoint for embed |
| P4 | **Timeout UX** | Generic “temporarily unavailable” | Distinguish: not found vs timeout vs rate limit with different copy and retry hint |
| P5 | **Target &lt;3s embed paint** | Unmeasured | Add RUM or manual timing in demo script; note in screenshot checklist |

---

## 7. Accessibility

Source: [UI guidelines — Accessibility](https://developers.openai.com/apps-sdk/concepts/ui-guidelines#accessibility)

| ID | Improvement | Current | Action |
|----|-------------|---------|--------|
| AC1 | **WCAG AA contrast audit in embed theme** | Gray-400/500 on white — may fail on some hosts | Verify with Apps SDK tokens; bump caveat text to secondary token |
| AC2 | **`details` / `summary` keyboard support** | Crime/flood caveats use native details | Ensure visible focus ring; test in iframe |
| AC3 | **Carousel a11y** | `role="list"` present | Add `aria-label` on scroll container; arrow key nav if keeping horizontal layout |
| AC4 | **Text resize** | Fixed `max-w-[480px]` | Test 200% zoom; avoid horizontal clip in comparison columns |
| AC5 | **Live regions for loading → loaded** | None | `aria-live="polite"` on widget shell when client hydration added |

---

## 8. Codex plugin & install-surface presentation

Source: [Build plugins](https://developers.openai.com/codex/plugins/build)

These affect how the app is discovered and presented, not inline card layout — but they are part of the overall UI story.

| ID | Improvement | Current | Action |
|----|-------------|---------|--------|
| D1 | **Plugin assets** | No `assets/` folder | Add `icon.png` (composer), `logo.png`, 3+ screenshots of **ChatGPT inline widgets** (not `/demo` localhost) |
| D2 | **`interface.screenshots` in manifest** | Missing from `plugin.json` | Point to `./assets/screenshot-*.png` |
| D3 | **Production URLs in manifest** | Placeholder `your-domain.example` | HTTPS privacy, terms, website after deploy |
| D4 | **Figma-first design pass** | Code-first Tailwind | Mock each widget in Figma Apps SDK library before token migration (V1) |
| D5 | **Skill aligns with widget UX** | `skills/uk-area-reports/SKILL.md` | Document which tools produce which visual; steer away from briefing when user asks one topic |

---

## 9. Tool ↔ widget matrix (target)

Enforce one primary inline surface per tool call:

| MCP tool | Widget route | Component | Display mode |
|----------|--------------|-----------|--------------|
| `get_area_summary` | `/widgets/area` | `InlineAreaSummary` | Inline |
| `get_crime_stats` | `/widgets/crime` | `CrimeTrendFragment` | Inline |
| `get_flood_risk` / `flood_check` | `/widgets/flood` | `FloodRiskFragment` | Inline |
| `get_planning_activity` | `/widgets/planning` | `PlanningApplicationsFragment` → carousel | Inline |
| `compare_areas` | `/widgets/compare` | `AreaComparisonFragment` | Inline |
| `briefing_for_postcode` | `/widgets/briefing` | `AreaBriefingFragment` (after U1 redesign) | Inline |
| `compare_postcodes_list` | `/widgets/compare-list` | `PostcodeCarouselFragment` | Inline carousel |
| `get_stop_search_stats` | `/widgets/stop-search` | `StopSearchFragment` | Inline |
| `explain_dataset` | — | Text only | None |
| *(future)* map explore | `/widgets/map` | `ReportMap` | Fullscreen |

---

## 10. Priority roadmap

### P0 — Must fix for credible ChatGPT inline UX

1. **U1 / C3** — Redesign briefing as one card (not four stacked cards).
2. **P1** — Widget loading skeletons.
3. **U4** — Conversational error/empty states on widget pages.
4. **U7** — Remove external link from flood inline card.
5. **C4** — Fix carousel nested scrolling pattern.
6. **D1 / D2** — Plugin screenshots from real ChatGPT embeds.

### P1 — Design system & display modes

1. **V1–V8** — Adopt Apps SDK UI tokens and components.
2. **C1, C2** — Card titles; planning carousel.
3. **U10** — Primary/secondary CTAs (max 2) on comparison and area cards.
4. **F1, F3** — Fullscreen map and crime chart with Expand control.
5. **V15** — Shared caveat footer component.
6. **A2** — Tool payload hydration (performance + instant paint).

### P2 — Polish & native MCP App

1. **A1, A5** — MCP UI resource registration and display mode metadata.
2. **V9–V12** — Icons and carousel imagery with alt text.
3. **AC1–AC5** — Full accessibility pass in ChatGPT embed.
4. **A4** — CSP / frame-ancestors for production embed.
5. **U5** — Follow-up hints visible in card footer.

### P3 — Deferred / out of scope

- Picture-in-picture mode (not applicable).
- Air quality, broadband, hospitals widgets (Tier 3 product).
- Full web report redesign (standalone site can keep current Tailwind styling until/unless unified with Apps SDK).

---

## 11. Verification checklist

Before marking UI work complete for App Store submission:

- [ ] Each tool renders **one** inline surface in ChatGPT Developer Mode (screenshots in `screenshots/chatgpt/`).
- [ ] Briefing card is a **single** scannable card, not a dashboard.
- [ ] No external links in inline cards that pull users out of chat.
- [ ] No nested scrolling inside inline cards.
- [ ] Max **two** primary actions per card where actions exist.
- [ ] Loading skeleton visible within first paint of iframe.
- [ ] Apps SDK UI tokens used for text, borders, surfaces (no raw `gray-*` in fragments).
- [ ] `brandColor` used only on primary buttons.
- [ ] WCAG AA contrast verified on caption/caveat text.
- [ ] Plugin manifest includes icon, logo, and inline widget screenshots.
- [ ] Demo script prompts ([chatgpt-demo-script.md](./chatgpt-demo-script.md)) match visible UI for all 6 scenarios.

---

## 12. Suggested implementation order (sprints)

**Sprint 1 — Inline card compliance (no new deps)**  
U1, C3, U7, C4, P1, U4, V15

**Sprint 2 — Design system**  
V1–V8, D4 (Figma), C1, C2, V9

**Sprint 3 — Actions & fullscreen**  
U10, F1, F3, U5

**Sprint 4 — MCP App native**  
A1, A2, A5, A4, AC1–AC5

---

*This plan reflects repository state as of 2026-05-19. Re-verify OpenAI platform requirements at submission time.*
