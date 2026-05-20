# ChatGPT App Demo Script

Use this script when testing MyAreaReport in ChatGPT Developer Mode or recording App Store screenshots. Prefer these prompts over the full web report tour.

## Prerequisites

- MCP server running with `WIDGET_BASE_URL` pointing at your deployed web app
- Connector registered (see `plugins/myareareport/.app.json`)
- Test postcodes: **CH1 4AB**, **M1 1AE**, **SW1A 1AA**

## Prompts (in order)

### 1. Area briefing (hero screenshot)

> Give me an area briefing for CH1 4AB

Expect: `briefing_for_postcode` tool, inline widget at `/widgets/briefing?postcode=CH1+4AB`, `shareable_summary` in response.

### 2. Moving comparison

> I'm moving house — compare crime and flood for CH1 4AB and M1 1AE

Expect: `compare_areas` or `compare_postcodes`, comparison widget.

### 3. Flood check

> Are there any active flood warnings near YO1 9QN?

Expect: `flood_check` or `get_flood_risk`.

### 4. Viewing shortlist carousel

> Compare crime and flood for CH1 4AB, M1 1AE, and BS1 4DJ — I'm shortlisting viewings

Expect: `compare_postcodes_list`, carousel widget.

### 5. Stop and search (niche)

> Show stop and search stats near SW1A 1AA for the last 3 months

Expect: `get_stop_search_stats` with caveats about guilt.

### 6. Trust / education

> Explain how MyAreaReport crime data is collected

Expect: `explain_dataset` with topic `crime`.

## Screenshot checklist (ChatGPT)

Capture inline widgets for:

- [ ] Briefing card (CH1 4AB)
- [ ] Two-postcode comparison
- [ ] Three-postcode carousel
- [ ] Flood warnings card
- [ ] Stop and search card (optional)

Save under `screenshots/chatgpt/` using names like `chatgpt-briefing-inline.png`.

## Default prompts (store listing)

These match `plugins/myareareport/.codex-plugin/plugin.json` `defaultPrompt` — keep in sync when changing copy.
