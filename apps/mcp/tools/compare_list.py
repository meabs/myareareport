"""Tool: compare_postcodes_list — compare up to five UK postcodes for shortlisting."""

import asyncio

import httpx

from tools.compare_areas import _fetch_report, _safe_get

MAX_POSTCODES = 5


async def compare_postcodes_list(postcodes: list[str], api_base_url: str) -> dict:
    """Fetch reports for multiple postcodes and return carousel-friendly items."""
    if not postcodes:
        return {"error": "At least one postcode is required"}

    if len(postcodes) > MAX_POSTCODES:
        return {
            "error": f"Maximum {MAX_POSTCODES} postcodes allowed",
            "max": MAX_POSTCODES,
        }

    async with httpx.AsyncClient(base_url=api_base_url, timeout=45.0) as client:
        reports = await asyncio.gather(*[_fetch_report(client, pc) for pc in postcodes])

    items: list[dict] = []
    errors: list[dict] = []

    for pc, report in zip(postcodes, reports, strict=True):
        if report.get("_error"):
            errors.append({"postcode": pc, **{k: v for k, v in report.items() if k != "_error"}})
            continue
        area = _safe_get(report, "area", "data") or {}
        crime = _safe_get(report, "sections", "crime", "data")
        flood = _safe_get(report, "sections", "flood", "data")
        flood_warnings = (
            len(_safe_get(flood, "current_warnings", default=[])) if flood else 0
        )
        items.append(
            {
                "postcode": area.get("postcode") or report.get("postcode"),
                "admin_district": area.get("admin_district"),
                "region": area.get("region"),
                "total_incidents": _safe_get(crime, "total_incidents") if crime else None,
                "crime_summary": _safe_get(report, "sections", "crime", "summary"),
                "flood_warnings": flood_warnings,
                "planning_count": _safe_get(
                    _safe_get(report, "sections", "planning", "data"),
                    "application_count",
                ),
            }
        )

    if not items and errors:
        return {"error": "No postcodes could be loaded", "details": errors}

    return {
        "items": items,
        "errors": errors if errors else None,
        "caveats": [
            "Comparisons use public datasets with different coverage and update schedules.",
            "Not for property or personal safety decisions.",
        ],
    }
