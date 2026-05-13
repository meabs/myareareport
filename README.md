# mcp-app-demo

Verdant Bank embedded sales demo built as an MCP App for ChatGPT and Claude.

## What it includes

- Embedded sales as the primary production use case
- Embedded acquisition architecture and capability-domain mockups
- Card discovery flow with Lloyds-inspired green styling under a different brand
- Eligibility-check orchestration demo with simulated decisioning
- Embedded application journey mockup with onboarding and fulfilment stages
- MCP server support for both stdio and streamable HTTP transports

## Quick start

```bash
npm install
npm run build
```

### Run as an MCP server over stdio

```bash
npm run start:stdio
```

### Run as an MCP server over HTTP

```bash
npm start
```

The HTTP endpoint is:

```text
http://localhost:3001/mcp
```

## MCP tools

- `embedded-sales-demo` — launches the full UI demo
- `recommend-embedded-card` — refreshes card discovery recommendations
- `run-eligibility-check` — simulates eligibility orchestration
- `prepare-application-journey` — prepares onboarding and fulfilment steps

## Local client wiring

For local stdio-based testing, point your MCP client at this repository and run:

```json
{
  "mcpServers": {
    "verdant-sales-demo": {
      "command": "bash",
      "args": [
        "-lc",
        "cd /path/to/mcp-app-demo && npm run start:stdio"
      ]
    }
  }
}
```

That pattern works for clients that support local MCP servers, including Claude and ChatGPT environments that allow stdio-backed MCP connections.
