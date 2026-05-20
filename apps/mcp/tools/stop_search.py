"""Tool: get_stop_search_stats — stop and search records for a UK postcode."""

import httpx


async def get_stop_search_stats(postcode: str, months: int, api_base_url: str) -> dict:
    """Call GET /stop-search/{postcode}?months={months}."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=30.0) as client:
        try:
            response = await client.get(f"/stop-search/{postcode}", params={"months": months})
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
            "error": "Unexpected error from stop and search service",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    return {
        "postcode": data.get("postcode"),
        "period_months": data.get("period_months"),
        "total": data.get("total"),
        "records": data.get("records", [])[:10],
        "source": data.get("source", "police.uk"),
        "caveats": data.get("caveats", []),
    }
