# Plugin assets

## SVG sources (version-controlled)

| File | Purpose |
|------|---------|
| `icon.svg` | Composer icon source — 512×512, brand blue (#2563EB), white map pin |
| `logo.svg` | Listing logo source — 1280×400, wordmark + tagline |

## PNG outputs (generated, not committed)

Run once to generate PNGs from the SVG sources:

```sh
npm install sharp
node make-png.js
```

Outputs: `icon.png` (512×512), `logo.png` (1280×400)

## Screenshots (manual, from ChatGPT Developer Mode)

Take screenshots in ChatGPT with the plugin installed. Target prompts:

| File | Prompt to use | Notes |
|------|---------------|-------|
| `screenshot-briefing.png` | "Give me an area briefing for CH1 4AB" | Capture the inline card only, not the chat chrome |
| `screenshot-crime.png` | "Crime stats for CH1 4AB" | Show the crime fragment with top categories |
| `screenshot-compare.png` | "Compare CH1 4AB and M1 1AA" | Side-by-side comparison card |
| `screenshot-planning.png` | "Planning applications near CH1 4AB" | Show the carousel rows with status badges |

**Screenshot spec** (from UI guidelines):
- Width: 1280px (retina capture → 640 CSS px)
- Show inline card only — not full browser window
- No cursor, tooltips, or developer tools visible
- Use a postcode with real data (CH1 4AB, M1 1AA work well)

## Before submission

- [ ] PNG files generated and present
- [ ] All 4 screenshots captured from real ChatGPT session
- [ ] Production URLs set in `.codex-plugin/plugin.json` (`websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`)
- [ ] `widget_base_url` in `.app.json` points to production HTTPS domain
- [ ] MCP server URL in `.mcp.json` points to production endpoint
