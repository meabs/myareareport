"""Tool: get_flood_risk — fetch flood risk information for a UK postcode."""

import httpx


async def get_flood_risk(postcode: str, api_base_url: str) -> dict:
    """Call GET /flood/{postcode} and return a structured dict."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=15.0) as client:
        try:
            response = await client.get(f"/flood/{postcode}")
        except httpx.RequestError as exc:
            return {
                "error": "Service temporarily unavailable",
                "detail": str(exc),
                "retryable": True,
            }

    if response.status_code == 404:
        return {"error": "Postcode not found", "postcode": postcode}

    if response.status_code == 503:
        return {"error": "Service temporarily unavailable", "retryable": True}

    if response.status_code != 200:
        return {
            "error": "Unexpected error from flood service",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    return {
        "postcode": data.get("postcode"),
        "current_warnings": data.get("current_warnings", []),
        "nearest_stations": data.get("nearest_stations", []),
        "summary": data.get("summary"),
        "source": data.get("source", "Environment Agency"),
        "caveats": data.get("caveats", []),
    }
