"""MyAreaReport MCP Server.

Exposes tools that call the MyAreaReport REST API. Responses include
suggested_followups, shareable_summary, and widget_url for ChatGPT Apps SDK.
"""

import os

from mcp.server.fastmcp import FastMCP

from response_helpers import (
    build_briefing_shareable,
    build_carousel_shareable,
    build_compare_shareable,
    enrich_response,
    widget_url,
)
from tools.area_summary import get_area_summary as _get_area_summary
from tools.briefing import briefing_for_postcode as _briefing_for_postcode
from tools.compare_areas import compare_areas as _compare_areas
from tools.compare_list import compare_postcodes_list as _compare_postcodes_list
from tools.crime_stats import get_crime_stats as _get_crime_stats
from tools.explain_dataset import explain_dataset as _explain_dataset
from tools.flood_risk import get_flood_risk as _get_flood_risk
from tools.planning_activity import get_planning_activity as _get_planning_activity
from tools.stop_search import get_stop_search_stats as _get_stop_search_stats

API_URL = os.getenv("API_URL", "http://localhost:8000")

mcp = FastMCP("MyAreaReport", host="0.0.0.0", port=8001)


@mcp.tool()
async def get_area_summary(postcode: str) -> dict:
    """Look up basic UK area metadata for a postcode (district, region, coordinates).

    Use when the user asks where a postcode is or needs location context before other tools.
    Postcode examples: CH1 4AB, SW1A 1AA, M1 1AE.
    """
    result = await _get_area_summary(postcode, API_URL)
    return enrich_response(
        result,
        tool="get_area_summary",
        widget_path="area",
        widget_params={"postcode": postcode},
        followups=[
            f"Give me a full briefing for {postcode}",
            f"Compare crime and flood data for {postcode} with another postcode",
        ],
    )


@mcp.tool()
async def get_crime_stats(postcode: str, months: int = 12) -> dict:
    """Get reported crime statistics for a UK postcode over recent months.

    Returns incident counts, trend summary, and top categories from police.uk.
    months: 1–12 (default 12). Not a safety score or ranking.
    """
    result = await _get_crime_stats(postcode, months, API_URL)
    shareable = None
    if not result.get("error") and result.get("summary"):
        shareable = f"**Crime near {postcode}**\n\n{result['summary']}\n\n_Source: police.uk_"
    return enrich_response(
        result,
        tool="get_crime_stats",
        widget_path="crime",
        widget_params={"postcode": postcode, "months": months},
        followups=[
            f"Show flood warnings for {postcode}",
            f"Compare {postcode} with another postcode",
            "Explain how crime data is collected",
        ],
        shareable=shareable,
    )


@mcp.tool()
async def get_flood_risk(postcode: str) -> dict:
    """Get active flood warnings and nearest monitoring stations for a UK postcode.

    Use for moving, weather events, or 'any floods near me' questions.
    """
    result = await _get_flood_risk(postcode, API_URL)
    shareable = None
    if not result.get("error") and result.get("summary"):
        shareable = f"**Flood near {postcode}**\n\n{result['summary']}\n\n_Source: Environment Agency_"
    return enrich_response(
        result,
        tool="get_flood_risk",
        widget_path="flood",
        widget_params={"postcode": postcode},
        followups=[
            f"Full area briefing for {postcode}",
            f"Compare flood risk: {postcode} vs another postcode",
        ],
        shareable=shareable,
    )


@mcp.tool()
async def flood_check(postcode: str) -> dict:
    """Quick flood warning check for a UK postcode (alias focused on active warnings).

    Prefer when the user only asks about floods, not full area reports.
    """
    result = await _get_flood_risk(postcode, API_URL)
    return enrich_response(
        result,
        tool="flood_check",
        widget_path="flood",
        widget_params={"postcode": postcode},
        followups=[f"Show planning applications near {postcode}", f"Area briefing for {postcode}"],
        shareable=result.get("summary") if not result.get("error") else None,
    )


@mcp.tool()
async def get_planning_activity(postcode: str, radius_km: float = 2.0) -> dict:
    """List nearby planning applications for a UK postcode within radius_km (default 2 km).

    Useful when asking about development, extensions, or neighbourhood change.
    """
    result = await _get_planning_activity(postcode, radius_km, API_URL)
    shareable = None
    if not result.get("error") and result.get("summary"):
        shareable = f"**Planning near {postcode}**\n\n{result['summary']}"
    return enrich_response(
        result,
        tool="get_planning_activity",
        widget_path="planning",
        widget_params={"postcode": postcode, "radius_km": radius_km},
        followups=[f"Crime stats for {postcode}", f"Compare {postcode} with another area"],
        shareable=shareable,
    )


@mcp.tool()
async def compare_areas(postcode_a: str, postcode_b: str) -> dict:
    """Compare crime, flood, and planning data between two UK postcodes side by side.

    Use when moving house, choosing between areas, or commuting comparisons.
    """
    result = await _compare_areas(postcode_a, postcode_b, API_URL)
    shareable = None
    if not result.get("error"):
        shareable = build_compare_shareable(
            postcode_a, postcode_b, result.get("comparison", {})
        )
    return enrich_response(
        result,
        tool="compare_areas",
        widget_path="compare",
        widget_params={"postcode_a": postcode_a, "postcode_b": postcode_b},
        followups=[
            "Add another postcode to the comparison",
            f"Full briefing for {postcode_a}",
        ],
        shareable=shareable,
    )


@mcp.tool()
async def briefing_for_postcode(postcode: str) -> dict:
    """One-shot area briefing: location, crime, flood, and planning for a UK postcode.

    Best for 'tell me about this postcode' or house-hunting first looks. Returns one composite view.
    """
    result = await _briefing_for_postcode(postcode, API_URL)
    shareable = build_briefing_shareable(result) if not result.get("error") else None
    return enrich_response(
        result,
        tool="briefing_for_postcode",
        widget_path="briefing",
        widget_params={"postcode": postcode},
        followups=[
            f"Compare {postcode} with another postcode",
            f"Stop and search stats for {postcode}",
            "Explain how crime data is collected",
        ],
        shareable=shareable,
    )


@mcp.tool()
async def get_stop_search_stats(postcode: str, months: int = 3) -> dict:
    """Get stop and search records near a UK postcode (police.uk, last 1–12 months).

    Stops are not indicators of guilt. Use for public-record context only.
    """
    result = await _get_stop_search_stats(postcode, months, API_URL)
    shareable = None
    if not result.get("error"):
        shareable = (
            f"**Stop and search near {postcode}**\n\n"
            f"{result.get('total', 0)} recorded stops over {months} month(s).\n\n"
            "_Stops are not indicators of guilt._"
        )
    return enrich_response(
        result,
        tool="get_stop_search_stats",
        widget_path="stop-search",
        widget_params={"postcode": postcode, "months": months},
        followups=[f"Area briefing for {postcode}", "Explain stop and search data"],
        shareable=shareable,
    )


@mcp.tool()
async def compare_postcodes_list(postcodes: list[str]) -> dict:
    """Compare up to five UK postcodes at once (e.g. shortlist of viewings).

    Pass full postcodes like ['CH1 4AB', 'M1 1AE', 'BS1 4DJ'].
    """
    result = await _compare_postcodes_list(postcodes, API_URL)
    shareable = None
    if not result.get("error") and result.get("items"):
        shareable = build_carousel_shareable(result["items"])
    pc_param = ",".join(postcodes)
    return enrich_response(
        result,
        tool="compare_postcodes_list",
        widget_path="compare-list",
        widget_params={"postcodes": pc_param},
        followups=["Compare two of these in more detail", "Explain crime data sources"],
        shareable=shareable,
    )


@mcp.tool()
async def explain_dataset(topic: str) -> dict:
    """Explain what a MyAreaReport dataset measures and its limitations.

    topic: crime | flood | planning | stop_search
    """
    result = _explain_dataset(topic)
    return enrich_response(
        result,
        tool="explain_dataset",
        followups=[
            "Briefing for CH1 4AB",
            "Compare CH1 4AB and M1 1AE",
        ],
    )


# ---------------------------------------------------------------------------
# A1/A5: UI resource templates — native Apps SDK widget binding.
# Each resource URI maps a postcode (or postcode pair) to the hosted widget URL.
# ChatGPT can fetch these via read_resource to render widgets without URL-only
# embeds. display_mode annotation signals inline vs fullscreen rendering.
# ---------------------------------------------------------------------------

@mcp.resource("ui://widget/area/{postcode}")
def ui_area(postcode: str) -> str:
    """Inline area summary widget."""
    return widget_url("area", {"postcode": postcode})


@mcp.resource("ui://widget/crime/{postcode}")
def ui_crime(postcode: str) -> str:
    """Inline crime statistics widget."""
    return widget_url("crime", {"postcode": postcode})


@mcp.resource("ui://widget/crime-chart/{postcode}")
def ui_crime_chart(postcode: str) -> str:
    """Fullscreen crime trend chart widget."""
    return widget_url("crime-chart", {"postcode": postcode})


@mcp.resource("ui://widget/flood/{postcode}")
def ui_flood(postcode: str) -> str:
    """Inline flood risk widget."""
    return widget_url("flood", {"postcode": postcode})


@mcp.resource("ui://widget/planning/{postcode}")
def ui_planning(postcode: str) -> str:
    """Inline planning applications widget."""
    return widget_url("planning", {"postcode": postcode})


@mcp.resource("ui://widget/briefing/{postcode}")
def ui_briefing(postcode: str) -> str:
    """Inline area briefing widget (single card)."""
    return widget_url("briefing", {"postcode": postcode})


@mcp.resource("ui://widget/compare/{postcode_a}/{postcode_b}")
def ui_compare(postcode_a: str, postcode_b: str) -> str:
    """Inline comparison widget for two postcodes."""
    return widget_url("compare", {"postcode_a": postcode_a, "postcode_b": postcode_b})


@mcp.resource("ui://widget/map/{postcode}")
def ui_map(postcode: str) -> str:
    """Fullscreen map widget."""
    return widget_url("map", {"postcode": postcode})


@mcp.resource("ui://widget/stop-search/{postcode}")
def ui_stop_search(postcode: str) -> str:
    """Inline stop-and-search widget."""
    return widget_url("stop-search", {"postcode": postcode})


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    if transport == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run()
