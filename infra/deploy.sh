#!/usr/bin/env bash
# deploy.sh — build and (re)start all services on the VPS.
# Run from the infra/ directory: ./deploy.sh
set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: infra/.env not found. Copy .env.example and fill in DOMAIN." >&2
  exit 1
fi

# Load DOMAIN so we can print the final URL
source .env
if [ -z "${DOMAIN:-}" ]; then
  echo "ERROR: DOMAIN is not set in .env" >&2
  exit 1
fi

echo "==> Building images..."
docker compose build

echo "==> Starting services..."
docker compose up -d

echo "==> Waiting for Caddy to obtain TLS certificate (up to 60s)..."
sleep 5
for i in {1..11}; do
  if curl -sf "https://${DOMAIN}/api/health" > /dev/null 2>&1; then
    echo "==> Health check passed."
    break
  fi
  echo "    ...waiting ($((i*5))s)"
  sleep 5
done

echo ""
echo "=== Deployment complete ==================================="
echo "  Web app:    https://${DOMAIN}"
echo "  API:        https://${DOMAIN}/api"
echo "  MCP (SSE):  https://${DOMAIN}/mcp/sse   ← connect Claude here"
echo "==========================================================="
echo ""
echo "To connect Claude Code:"
echo "  claude mcp add --transport sse myareareport https://${DOMAIN}/mcp/sse"
echo ""
echo "To connect Claude Desktop — add to claude_desktop_config.json:"
echo '  "mcpServers": { "myareareport": { "url": "https://'"${DOMAIN}"'/mcp/sse", "transport": "sse" } }'
