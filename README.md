# MyAreaReport

UK area reports using public data: crime, flood, and planning.

## Pages

- **Homepage** — `http://localhost:3000` — postcode search
- **Report** — `http://localhost:3000/report/{postcode}` — full area report
- **Demo** — `http://localhost:3000/demo` — compact fragments for embedded use
- **Privacy** — `http://localhost:3000/privacy`
- **Terms** — `http://localhost:3000/terms`
- **Data Sources** — `http://localhost:3000/data-sources`

## MCP Server

An MCP server exposing 5 tools is available in `apps/mcp/`. See [docs/mcp-usage.md](docs/mcp-usage.md) for tool descriptions, usage examples, and integration instructions.

## Local Development

### Prerequisites

- Docker and Docker Compose
- Python 3.12 (for running tests locally)

### Start with Docker Compose

```bash
cp infra/.env.example infra/.env
cd infra
docker compose up --build
```

Test the running service:

```bash
curl http://localhost:8000/
curl http://localhost:8000/health
```

The Caddy reverse proxy is available at `http://localhost:8080`.

### Run Tests Locally

From `apps/api`:

```bash
pip install -e ".[dev]"
pytest
```

### Lint and Type Check

```bash
ruff check .
mypy .
```

## Sentry Setup

1. Create a project at [sentry.io](https://sentry.io).
2. Copy the project DSN.
3. Add it to `infra/.env` as `SENTRY_DSN=<your-dsn>`.
4. Restart the API service.

Do not commit the DSN to source control.

### Verify Sentry (development only)

Add this temporary endpoint to `app/main.py`:

```python
@app.get("/debug-sentry")
async def debug_sentry() -> None:
    raise RuntimeError("Sentry test error")
```

Hit `GET /debug-sentry` and confirm the error appears in your Sentry project. Remove the endpoint afterwards.

## Environment Variables

See `infra/.env.example` for all supported variables.

## Structure

```
myareareport/
├── apps/
│   ├── api/           # FastAPI application
│   ├── web/           # Next.js web app
│   └── mcp/           # MCP server (5 tools)
├── infra/             # Docker Compose, Caddy, env config
├── docs/              # Documentation and checklists
└── README.md
```
