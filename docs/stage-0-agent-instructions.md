# MyAreaReport API

Stage 0 — Repository Bootstrap + Observability

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
│   └── api/           # FastAPI application
├── infra/             # Docker Compose, Caddy, env config
├── docs/              # Build instructions
└── README.md
```
