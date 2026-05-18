"""Tool: get_area_summary — fetch area information for a UK postcode."""

import httpx


async def get_area_summary(postcode: str, api_base_url: str) -> dict:
    """Call GET /area/{postcode} and return a structured dict."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=10.0) as client:
        try:
            response = await client.get(f"/area/{postcode}")
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
            "error": "Unexpected error from area service",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    return {
        "postcode": data.get("postcode"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "admin_district": data.get("admin_district"),
        "admin_county": data.get("admin_county"),
        "region": data.get("region"),
        "country": data.get("country"),
        "source": data.get("source", "postcodes.io"),
    }
