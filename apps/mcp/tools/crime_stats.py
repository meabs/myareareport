"""Tool: get_crime_stats — fetch crime statistics for a UK postcode."""

import httpx


async def get_crime_stats(postcode: str, months: int, api_base_url: str) -> dict:
    """Call GET /crime/{postcode}?months={months} and return a structured dict."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=30.0) as client:
        try:
            response = await client.get(f"/crime/{postcode}", params={"months": months})
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
            "error": "Unexpected error from crime service",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    return {
        "postcode": data.get("postcode"),
        "period_months": data.get("period_months"),
        "total_incidents": data.get("total_incidents"),
        "top_categories": data.get("top_categories", []),
        "monthly_trend": data.get("monthly_trend", []),
        "summary": data.get("summary"),
        "source": data.get("source", "police.uk"),
        "updated_frequency": data.get("updated_frequency", "Monthly"),
        "caveats": data.get("caveats", []),
    }
