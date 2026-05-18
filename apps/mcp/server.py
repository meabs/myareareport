"""MyAreaReport MCP Server.

Exposes 5 tools that call the MyAreaReport REST API over HTTP.
API base URL is read from the API_URL environment variable (default: http://localhost:8000).
"""

import os

from mcp.server.fastmcp import FastMCP

from tools.area_summary import get_area_summary as _get_area_summary
from tools.compare_areas import compare_areas as _compare_areas
from tools.crime_stats import get_crime_stats as _get_crime_stats
from tools.flood_risk import get_flood_risk as _get_flood_risk
from tools.planning_activity import get_planning_activity as _get_planning_activity

API_URL = os.getenv("API_URL", "http://localhost:8000")

mcp = FastMCP("MyAreaReport")


@mcp.tool()
async def get_area_summary(postcode: str) -> dict:
    """Get area information for a UK postcode."""
    return await _get_area_summary(postcode, API_URL)


@mcp.tool()
async def get_crime_stats(postcode: str, months: int = 12) -> dict:
    """Get reported crime statistics for a UK postcode area."""
    return await _get_crime_stats(postcode, months, API_URL)


@mcp.tool()
async def get_flood_risk(postcode: str) -> dict:
    """Get flood risk and warning information for a UK postcode."""
    return await _get_flood_risk(postcode, API_URL)


@mcp.tool()
async def get_planning_activity(postcode: str, radius_km: float = 2.0) -> dict:
    """Get nearby planning applications for a UK postcode."""
    return await _get_planning_activity(postcode, radius_km, API_URL)


@mcp.tool()
async def compare_areas(postcode_a: str, postcode_b: str) -> dict:
    """Compare area data between two UK postcodes."""
    return await _compare_areas(postcode_a, postcode_b, API_URL)


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    if transport == "sse":
        mcp.run(transport="sse", host="0.0.0.0", port=8001)
    else:
        mcp.run()
