"""Tool: briefing_for_postcode — composite area briefing from full report."""

import httpx

from tools.compare_areas import _fetch_report, _safe_get


def _section_status(report: dict, section: str) -> str:
    return str(_safe_get(report, "sections", section, "status", default="unavailable"))


async def briefing_for_postcode(postcode: str, api_base_url: str) -> dict:
    """Fetch GET /report/{postcode} and return a compact briefing payload."""
    async with httpx.AsyncClient(base_url=api_base_url, timeout=30.0) as client:
        report = await _fetch_report(client, postcode)

    if report.get("_error"):
        return {k: v for k, v in report.items() if k != "_error"}

    area_data = _safe_get(report, "area", "data") or {}
    crime_data = _safe_get(report, "sections", "crime", "data")
    flood_data = _safe_get(report, "sections", "flood", "data")
    planning_data = _safe_get(report, "sections", "planning", "data")

    return {
        "postcode": report.get("postcode") or area_data.get("postcode"),
        "area": area_data,
        "crime": {
            "status": _section_status(report, "crime"),
            "summary": _safe_get(report, "sections", "crime", "summary"),
            "data": crime_data,
        },
        "flood": {
            "status": _section_status(report, "flood"),
            "summary": _safe_get(report, "sections", "flood", "summary"),
            "data": flood_data,
        },
        "planning": {
            "status": _section_status(report, "planning"),
            "summary": _safe_get(report, "sections", "planning", "summary"),
            "data": planning_data,
        },
        "sources": report.get("sources", []),
        "caveats": [
            "MyAreaReport uses public datasets that may be delayed, incomplete, or vary by provider.",
            "Not for emergency, legal, insurance, or personal safety decisions.",
        ],
    }
