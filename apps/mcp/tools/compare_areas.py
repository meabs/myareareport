"""Tool: compare_areas — compare two UK postcodes across crime, flood, and planning data."""

import asyncio

import httpx


async def _fetch_report(client: httpx.AsyncClient, postcode: str) -> dict:
    """Fetch GET /report/{postcode}, returning the parsed JSON or an error dict."""
    try:
        response = await client.get(f"/report/{postcode}")
    except httpx.RequestError as exc:
        return {"_error": True, "error": "Service temporarily unavailable", "detail": str(exc), "retryable": True}

    if response.status_code == 404:
        return {"_error": True, "error": "Postcode not found", "postcode": postcode}

    if response.status_code == 503:
        return {"_error": True, "error": "Service temporarily unavailable", "retryable": True}

    if response.status_code != 200:
        return {
            "_error": True,
            "error": "Unexpected error fetching report",
            "status_code": response.status_code,
            "retryable": False,
        }

    data = response.json()
    data["_error"] = False
    return data


def _safe_get(report: dict, *keys, default=None):
    """Safely traverse nested dict keys, returning default on any missing key or None."""
    value = report
    for key in keys:
        if not isinstance(value, dict):
            return default
        value = value.get(key)
        if value is None:
            return default
    return value


async def compare_areas(postcode_a: str, postcode_b: str, api_base_url: str) -> dict:
    """Fetch reports for two postcodes concurrently and return a structured comparison."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=30.0) as client:
        report_a, report_b = await asyncio.gather(
            _fetch_report(client, postcode_a),
            _fetch_report(client, postcode_b),
        )

    # Surface errors for either postcode immediately
    if report_a.get("_error"):
        error = {k: v for k, v in report_a.items() if k != "_error"}
        return {"error": f"Failed to fetch data for {postcode_a}", "detail": error}

    if report_b.get("_error"):
        error = {k: v for k, v in report_b.items() if k != "_error"}
        return {"error": f"Failed to fetch data for {postcode_b}", "detail": error}

    # Extract section data safely
    crime_a_data = _safe_get(report_a, "sections", "crime", "data")
    crime_b_data = _safe_get(report_b, "sections", "crime", "data")
    flood_a_data = _safe_get(report_a, "sections", "flood", "data")
    flood_b_data = _safe_get(report_b, "sections", "flood", "data")
    planning_a_data = _safe_get(report_a, "sections", "planning", "data")
    planning_b_data = _safe_get(report_b, "sections", "planning", "data")

    crime_a_total = _safe_get(crime_a_data, "total_incidents") if crime_a_data else None
    crime_b_total = _safe_get(crime_b_data, "total_incidents") if crime_b_data else None
    flood_a_warnings = (
        len(_safe_get(flood_a_data, "current_warnings", default=[])) if flood_a_data else None
    )
    flood_b_warnings = (
        len(_safe_get(flood_b_data, "current_warnings", default=[])) if flood_b_data else None
    )

    crime_delta: int | None = None
    if crime_a_total is not None and crime_b_total is not None:
        crime_delta = crime_b_total - crime_a_total

    return {
        "area_a": _safe_get(report_a, "area", "data"),
        "area_b": _safe_get(report_b, "area", "data"),
        "comparison": {
            "crime": {
                "area_a_total": crime_a_total,
                "area_b_total": crime_b_total,
                "incident_delta_b_minus_a": crime_delta,
                "area_a_summary": _safe_get(report_a, "sections", "crime", "summary"),
                "area_b_summary": _safe_get(report_b, "sections", "crime", "summary"),
            },
            "flood": {
                "area_a_warnings": flood_a_warnings,
                "area_b_warnings": flood_b_warnings,
            },
            "planning": {
                "area_a_count": _safe_get(planning_a_data, "application_count") if planning_a_data else None,
                "area_b_count": _safe_get(planning_b_data, "application_count") if planning_b_data else None,
            },
        },
        "caveats": [
            "Data comparisons are based on public datasets that may have different coverage or lag times.",
            "Crime, flood, and planning data should not be used for property or safety decisions.",
        ],
    }
