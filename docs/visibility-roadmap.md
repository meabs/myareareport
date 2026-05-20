# Visibility roadmap

Phased plan to make MyAreaReport discoverable in the ChatGPT App Store and Codex plugin directory. Goal: portfolio visibility, not monetization.

See also: [sub.md](./sub.md) (submission audit), [chatgpt-demo-script.md](./chatgpt-demo-script.md).

## Tier 0 — Submission plumbing (done in repo)

- [x] MCP tools return `widget_url`, `suggested_followups`, `shareable_summary`
- [x] Hosted widget routes under `/widgets/*`
- [x] Caddy `/mcp/*` reverse proxy to MCP SSE
- [x] Codex plugin scaffold: `plugins/myareareport/`, `.agents/plugins/marketplace.json`
- [ ] **You:** Deploy production HTTPS and update URLs in plugin manifests
- [ ] **You:** Register ChatGPT connector and capture inline screenshots

## Tier 1 — Scenario tools (implemented)

| Tool | Widget |
|------|--------|
| `briefing_for_postcode` | `/widgets/briefing` |
| `flood_check` | `/widgets/flood` |
| `get_stop_search_stats` | `/widgets/stop-search` |
| `compare_postcodes_list` | `/widgets/compare-list` |
| `explain_dataset` | (text; no widget) |

## Tier 2 — Discoverability (partial)

- [x] `defaultPrompt` in plugin manifest
- [x] ChatGPT demo script
- [x] README App Store section
- [ ] App Store screenshots in `screenshots/chatgpt/`
- [ ] Blog post or thread with demo GIF

## Tier 3 — Deferred

- Air quality, broadband, hospitals (public data only)
- Session shortlist without accounts
- Apps SDK UI design tokens (`@openai/apps-sdk-ui`)

## Positioning

> Ask ChatGPT about any UK postcode using official public data—crime trends, flood warnings, and planning—in plain English, with sources shown.
