"""Tool: get_planning_activity — fetch planning applications near a UK postcode."""

import httpx


async def get_planning_activity(
    postcode: str, radius_km: float, api_base_url: str
) -> dict:
    """Call GET /planning/{postcode}?radius_km={radius_km} and return a structured dict."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=30.0) as client:
        try:
            response = await client.get(
                f"/planning/{postcode}", params={"radius_km": radius_km}
            )
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
            "error": "Unexpected error from planning service",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    return {
        "postcode": data.get("postcode"),
        "radius_km": data.get("radius_km"),
        "application_count": data.get("application_count"),
        "applications": data.get("applications", []),
        "summary": data.get("summary"),
        "caveats": data.get("caveats", []),
    }
