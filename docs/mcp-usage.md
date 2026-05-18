# MyAreaReport MCP Server

The MyAreaReport MCP server exposes five tools that let any MCP-compatible client (Claude Desktop, Cursor, custom agents) query UK area data — crime, flood risk, and planning applications — for any UK postcode.

The server is a thin HTTP client over the MyAreaReport REST API. It does **not** embed any data itself; all data comes from the running API.

---

## Running locally

### Prerequisites

- Python 3.12+
- The MyAreaReport REST API running (default: `http://localhost:8000`)

### Install and run (stdio mode — for MCP clients)

```bash
cd apps/mcp
python3 -m venv .venv
.venv/bin/pip install -e .

# Point at a running API
API_URL=http://localhost:8000 .venv/bin/python server.py
```

### Run as SSE server (for browser / network clients)

```bash
API_URL=http://localhost:8000 MCP_TRANSPORT=sse .venv/bin/python server.py
# Listens on http://0.0.0.0:8001
```

### Docker Compose (all services together)

```bash
cd infra
docker compose up --build
```

The MCP server will be available at `http://localhost:8001` (SSE transport).

---

## Environment variables

| Variable        | Default                  | Description                                |
|-----------------|--------------------------|--------------------------------------------|
| `API_URL`       | `http://localhost:8000`  | Base URL of the MyAreaReport REST API      |
| `MCP_TRANSPORT` | `stdio`                  | Transport: `stdio` (MCP clients) or `sse` (HTTP) |

---

## Tools

### `get_area_summary`

Get basic area information for a UK postcode.

**Parameters**

| Name       | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| `postcode` | string | yes      | UK postcode          |

**Example input**

```json
{ "postcode": "SW1A 1AA" }
```

**Example output**

```json
{
  "postcode": "SW1A1AA",
  "latitude": 51.501009,
  "longitude": -0.141588,
  "admin_district": "Westminster",
  "admin_county": null,
  "region": "London",
  "country": "England",
  "source": "postcodes.io"
}
```

---

### `get_crime_stats`

Get reported crime statistics for a UK postcode area over recent months.

**Parameters**

| Name       | Type    | Required | Default | Description                        |
|------------|---------|----------|---------|------------------------------------|
| `postcode` | string  | yes      |         | UK postcode                        |
| `months`   | integer | no       | `12`    | Number of months of data to return |

**Example input**

```json
{ "postcode": "M1 1AE", "months": 6 }
```

**Example output**

```json
{
  "postcode": "M11AE",
  "period_months": 6,
  "total_incidents": 312,
  "top_categories": [
    { "category": "anti-social-behaviour", "count": 80 },
    { "category": "vehicle-crime", "count": 55 }
  ],
  "monthly_trend": [
    { "month": "2025-10", "count": 50 },
    { "month": "2025-11", "count": 48 }
  ],
  "summary": "312 incidents reported over 6 months ...",
  "source": "police.uk",
  "updated_frequency": "Monthly",
  "caveats": ["Crime data is published monthly and may lag behind current conditions."]
}
```

---

### `get_flood_risk`

Get current flood warnings and nearest river/tidal monitoring stations for a UK postcode.

**Parameters**

| Name       | Type   | Required | Description |
|------------|--------|----------|-------------|
| `postcode` | string | yes      | UK postcode |

**Example input**

```json
{ "postcode": "YO1 9QN" }
```

**Example output**

```json
{
  "postcode": "YO19QN",
  "current_warnings": [
    {
      "severity": "Flood Warning",
      "message": "Flooding is expected. Immediate action required.",
      "area": "River Ouse at York",
      "source": "Environment Agency"
    }
  ],
  "nearest_stations": [
    {
      "label": "Ouse at York",
      "distance_km": 0.8,
      "latest_level_m": 3.12,
      "timestamp": "2025-01-15T09:00:00Z"
    }
  ],
  "summary": "1 active flood warning in this area ...",
  "source": "Environment Agency",
  "caveats": ["Flood data can change quickly."]
}
```

---

### `get_planning_activity`

Get nearby planning applications for a UK postcode within a given radius.

**Parameters**

| Name        | Type   | Required | Default | Description                    |
|-------------|--------|----------|---------|--------------------------------|
| `postcode`  | string | yes      |         | UK postcode                    |
| `radius_km` | float  | no       | `2.0`   | Search radius in kilometres    |

**Example input**

```json
{ "postcode": "E1 6RF", "radius_km": 1.0 }
```

**Example output**

```json
{
  "postcode": "E16RF",
  "radius_km": 1.0,
  "application_count": 3,
  "applications": [
    {
      "reference": "PA/2024/12345",
      "status": "approved",
      "description": "Erection of single-storey rear extension",
      "address": "12 Brick Lane, London",
      "distance_km": 0.4,
      "decision_date": "2024-11-20",
      "source": "planning.data.gov.uk"
    }
  ],
  "summary": "3 planning applications found within 1 km ...",
  "caveats": ["Planning data coverage varies by local authority."]
}
```

---

### `compare_areas`

Compare crime, flood risk, and planning activity between two UK postcodes side by side.

**Parameters**

| Name         | Type   | Required | Description            |
|--------------|--------|----------|------------------------|
| `postcode_a` | string | yes      | First UK postcode      |
| `postcode_b` | string | yes      | Second UK postcode     |

**Example input**

```json
{ "postcode_a": "SW1A 1AA", "postcode_b": "M1 1AE" }
```

**Example output**

```json
{
  "area_a": { "postcode": "SW1A1AA", "region": "London", ... },
  "area_b": { "postcode": "M11AE", "region": "North West", ... },
  "comparison": {
    "crime": {
      "area_a_total": 150,
      "area_b_total": 320,
      "area_a_summary": "Moderate crime levels ...",
      "area_b_summary": "High crime levels ..."
    },
    "flood": {
      "area_a_warnings": 0,
      "area_b_warnings": 1
    },
    "planning": {
      "area_a_count": 5,
      "area_b_count": 12
    }
  },
  "caveats": [
    "Data comparisons are based on public datasets that may have different coverage or lag times.",
    "Crime, flood, and planning data should not be used for property or safety decisions."
  ]
}
```

---

## Connecting from an MCP client

### Claude Desktop (stdio)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "myareareport": {
      "command": "/path/to/apps/mcp/.venv/bin/python",
      "args": ["/path/to/apps/mcp/server.py"],
      "env": {
        "API_URL": "http://localhost:8000"
      }
    }
  }
}
```

### SSE client (network)

Point your MCP client at `http://localhost:8001/sse` when running with `MCP_TRANSPORT=sse`.

---

## Error handling

All tools return structured error dicts rather than raising exceptions:

| Condition              | Response shape                                                   |
|------------------------|------------------------------------------------------------------|
| Postcode not found     | `{"error": "Postcode not found", "postcode": "<pc>"}`            |
| Provider unavailable   | `{"error": "Service temporarily unavailable", "retryable": true}`|
| Network error          | `{"error": "Service temporarily unavailable", "retryable": true, "detail": "..."}` |
