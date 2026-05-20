"""Tests for MCP tool functions.

All tests mock httpx to avoid real API calls.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

API_URL = "http://localhost:8000"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_response(status_code: int, body: dict) -> MagicMock:
    """Create a mock httpx.Response."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = body
    return mock


def _make_async_client(response: MagicMock) -> MagicMock:
    """Return a mock async context manager that yields a client with get/post returning response."""
    client = MagicMock()
    client.get = AsyncMock(return_value=response)
    client.post = AsyncMock(return_value=response)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


# ---------------------------------------------------------------------------
# get_area_summary
# ---------------------------------------------------------------------------

AREA_PAYLOAD = {
    "postcode": "SW1A1AA",
    "latitude": 51.5,
    "longitude": -0.1,
    "admin_district": "Westminster",
    "admin_county": None,
    "region": "London",
    "country": "England",
    "source": "postcodes.io",
}


@pytest.mark.asyncio
async def test_get_area_summary_success():
    from tools.area_summary import get_area_summary

    mock_cm = _make_async_client(_make_response(200, AREA_PAYLOAD))
    with patch("tools.area_summary.httpx.AsyncClient", return_value=mock_cm):
        result = await get_area_summary("SW1A1AA", API_URL)

    assert result["postcode"] == "SW1A1AA"
    assert result["country"] == "England"
    assert "error" not in result


@pytest.mark.asyncio
async def test_get_area_summary_404():
    from tools.area_summary import get_area_summary

    mock_cm = _make_async_client(_make_response(404, {"error": {"code": "invalid_postcode"}}))
    with patch("tools.area_summary.httpx.AsyncClient", return_value=mock_cm):
        result = await get_area_summary("INVALID", API_URL)

    assert result["error"] == "Postcode not found"
    assert result["postcode"] == "INVALID"


@pytest.mark.asyncio
async def test_get_area_summary_503():
    from tools.area_summary import get_area_summary

    mock_cm = _make_async_client(_make_response(503, {}))
    with patch("tools.area_summary.httpx.AsyncClient", return_value=mock_cm):
        result = await get_area_summary("SW1A1AA", API_URL)

    assert result["error"] == "Service temporarily unavailable"
    assert result["retryable"] is True


# ---------------------------------------------------------------------------
# get_crime_stats
# ---------------------------------------------------------------------------

CRIME_PAYLOAD = {
    "postcode": "SW1A1AA",
    "period_months": 12,
    "total_incidents": 150,
    "top_categories": [{"category": "burglary", "count": 20}],
    "monthly_trend": [{"month": "2025-01", "count": 12}],
    "summary": "Moderate crime levels.",
    "source": "police.uk",
    "updated_frequency": "Monthly",
    "caveats": ["Data may lag."],
}


@pytest.mark.asyncio
async def test_get_crime_stats_success():
    from tools.crime_stats import get_crime_stats

    mock_cm = _make_async_client(_make_response(200, CRIME_PAYLOAD))
    with patch("tools.crime_stats.httpx.AsyncClient", return_value=mock_cm):
        result = await get_crime_stats("SW1A1AA", 12, API_URL)

    assert result["postcode"] == "SW1A1AA"
    assert result["total_incidents"] == 150
    assert "error" not in result


@pytest.mark.asyncio
async def test_get_crime_stats_404():
    from tools.crime_stats import get_crime_stats

    mock_cm = _make_async_client(_make_response(404, {}))
    with patch("tools.crime_stats.httpx.AsyncClient", return_value=mock_cm):
        result = await get_crime_stats("BADPC", 12, API_URL)

    assert result["error"] == "Postcode not found"
    assert result["postcode"] == "BADPC"


@pytest.mark.asyncio
async def test_get_crime_stats_503():
    from tools.crime_stats import get_crime_stats

    mock_cm = _make_async_client(_make_response(503, {}))
    with patch("tools.crime_stats.httpx.AsyncClient", return_value=mock_cm):
        result = await get_crime_stats("SW1A1AA", 12, API_URL)

    assert result["retryable"] is True


# ---------------------------------------------------------------------------
# get_flood_risk
# ---------------------------------------------------------------------------

FLOOD_PAYLOAD = {
    "postcode": "SW1A1AA",
    "current_warnings": [],
    "nearest_stations": [
        {"label": "Thames at Teddington", "distance_km": 12.3, "latest_level_m": 0.5, "timestamp": None}
    ],
    "summary": "No active warnings.",
    "source": "Environment Agency",
    "caveats": ["Flood data can change quickly."],
}


@pytest.mark.asyncio
async def test_get_flood_risk_success():
    from tools.flood_risk import get_flood_risk

    mock_cm = _make_async_client(_make_response(200, FLOOD_PAYLOAD))
    with patch("tools.flood_risk.httpx.AsyncClient", return_value=mock_cm):
        result = await get_flood_risk("SW1A1AA", API_URL)

    assert result["postcode"] == "SW1A1AA"
    assert result["current_warnings"] == []
    assert "error" not in result


@pytest.mark.asyncio
async def test_get_flood_risk_404():
    from tools.flood_risk import get_flood_risk

    mock_cm = _make_async_client(_make_response(404, {}))
    with patch("tools.flood_risk.httpx.AsyncClient", return_value=mock_cm):
        result = await get_flood_risk("BADPC", API_URL)

    assert result["error"] == "Postcode not found"


@pytest.mark.asyncio
async def test_get_flood_risk_503():
    from tools.flood_risk import get_flood_risk

    mock_cm = _make_async_client(_make_response(503, {}))
    with patch("tools.flood_risk.httpx.AsyncClient", return_value=mock_cm):
        result = await get_flood_risk("SW1A1AA", API_URL)

    assert result["retryable"] is True


# ---------------------------------------------------------------------------
# get_planning_activity
# ---------------------------------------------------------------------------

PLANNING_PAYLOAD = {
    "postcode": "SW1A1AA",
    "radius_km": 2.0,
    "application_count": 5,
    "applications": [
        {
            "reference": "REF123",
            "status": "approved",
            "description": "Loft conversion",
            "address": "1 Example St",
            "distance_km": 0.3,
            "decision_date": "2025-01-15",
            "source": "planning.data.gov.uk",
        }
    ],
    "summary": "5 planning applications found.",
    "caveats": ["Coverage varies."],
}


@pytest.mark.asyncio
async def test_get_planning_activity_success():
    from tools.planning_activity import get_planning_activity

    mock_cm = _make_async_client(_make_response(200, PLANNING_PAYLOAD))
    with patch("tools.planning_activity.httpx.AsyncClient", return_value=mock_cm):
        result = await get_planning_activity("SW1A1AA", 2.0, API_URL)

    assert result["postcode"] == "SW1A1AA"
    assert result["application_count"] == 5
    assert "error" not in result


@pytest.mark.asyncio
async def test_get_planning_activity_404():
    from tools.planning_activity import get_planning_activity

    mock_cm = _make_async_client(_make_response(404, {}))
    with patch("tools.planning_activity.httpx.AsyncClient", return_value=mock_cm):
        result = await get_planning_activity("BADPC", 2.0, API_URL)

    assert result["error"] == "Postcode not found"


@pytest.mark.asyncio
async def test_get_planning_activity_503():
    from tools.planning_activity import get_planning_activity

    mock_cm = _make_async_client(_make_response(503, {}))
    with patch("tools.planning_activity.httpx.AsyncClient", return_value=mock_cm):
        result = await get_planning_activity("SW1A1AA", 2.0, API_URL)

    assert result["retryable"] is True


# ---------------------------------------------------------------------------
# compare_areas
# ---------------------------------------------------------------------------

REPORT_A = {
    "_error": False,
    "postcode": "SW1A1AA",
    "area": {
        "status": "available",
        "data": {
            "postcode": "SW1A1AA",
            "latitude": 51.5,
            "longitude": -0.1,
            "admin_district": "Westminster",
            "admin_county": None,
            "region": "London",
            "country": "England",
        },
    },
    "sections": {
        "crime": {
            "status": "available",
            "summary": "Moderate crime.",
            "data": {"total_incidents": 150, "top_categories": [], "monthly_trend": []},
        },
        "flood": {
            "status": "available",
            "summary": "No warnings.",
            "data": {"current_warnings": [], "nearest_stations": []},
        },
        "planning": {
            "status": "available",
            "summary": "5 applications.",
            "data": {"application_count": 5, "applications": []},
        },
    },
}

REPORT_B = {
    "_error": False,
    "postcode": "M11AE",
    "area": {
        "status": "available",
        "data": {
            "postcode": "M11AE",
            "latitude": 53.4,
            "longitude": -2.2,
            "admin_district": "Manchester",
            "admin_county": None,
            "region": "North West",
            "country": "England",
        },
    },
    "sections": {
        "crime": {
            "status": "available",
            "summary": "Reported incidents increased over the selected period.",
            "data": {"total_incidents": 320, "top_categories": [], "monthly_trend": []},
        },
        "flood": {
            "status": "available",
            "summary": "One warning.",
            "data": {
                "current_warnings": [{"severity": "warning", "message": "River flood"}],
                "nearest_stations": [],
            },
        },
        "planning": {
            "status": "available",
            "summary": "12 applications.",
            "data": {"application_count": 12, "applications": []},
        },
    },
}


@pytest.mark.asyncio
async def test_compare_areas_success():
    from tools.compare_areas import compare_areas

    # Two sequential responses: report_a then report_b
    responses = [_make_response(200, REPORT_A), _make_response(200, REPORT_B)]
    call_count = 0

    async def mock_get(url, **kwargs):
        nonlocal call_count
        resp = responses[call_count]
        call_count += 1
        return resp

    client = MagicMock()
    client.get = mock_get
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("tools.compare_areas.httpx.AsyncClient", return_value=cm):
        result = await compare_areas("SW1A1AA", "M11AE", API_URL)

    assert result["area_a"]["postcode"] == "SW1A1AA"
    assert result["area_b"]["postcode"] == "M11AE"
    assert result["comparison"]["crime"]["area_a_total"] == 150
    assert result["comparison"]["crime"]["area_b_total"] == 320
    assert result["comparison"]["crime"]["incident_delta_b_minus_a"] == 170
    assert result["comparison"]["flood"]["area_a_warnings"] == 0
    assert result["comparison"]["flood"]["area_b_warnings"] == 1
    assert result["comparison"]["planning"]["area_a_count"] == 5
    assert result["comparison"]["planning"]["area_b_count"] == 12
    assert len(result["caveats"]) == 2
    assert "error" not in result


@pytest.mark.asyncio
async def test_compare_areas_404_postcode_a():
    from tools.compare_areas import compare_areas

    responses = [_make_response(404, {}), _make_response(200, REPORT_B)]
    call_count = 0

    async def mock_get(url, **kwargs):
        nonlocal call_count
        resp = responses[call_count]
        call_count += 1
        return resp

    client = MagicMock()
    client.get = mock_get
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("tools.compare_areas.httpx.AsyncClient", return_value=cm):
        result = await compare_areas("BADPC", "M11AE", API_URL)

    assert "error" in result
    assert "BADPC" in result["error"]


@pytest.mark.asyncio
async def test_compare_areas_404_postcode_b():
    from tools.compare_areas import compare_areas

    responses = [_make_response(200, REPORT_A), _make_response(404, {})]
    call_count = 0

    async def mock_get(url, **kwargs):
        nonlocal call_count
        resp = responses[call_count]
        call_count += 1
        return resp

    client = MagicMock()
    client.get = mock_get
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("tools.compare_areas.httpx.AsyncClient", return_value=cm):
        result = await compare_areas("SW1A1AA", "BADPC", API_URL)

    assert "error" in result
    assert "BADPC" in result["error"]


# ---------------------------------------------------------------------------
# briefing_for_postcode
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_briefing_for_postcode_success():
    from tools.briefing import briefing_for_postcode

    mock_cm = _make_async_client(_make_response(200, REPORT_A))
    with patch("tools.briefing.httpx.AsyncClient", return_value=mock_cm):
        result = await briefing_for_postcode("SW1A 1AA", API_URL)

    assert result["postcode"] == "SW1A1AA"
    assert result["area"]["postcode"] == "SW1A1AA"
    assert result["crime"]["status"] == "available"
    assert "error" not in result


# ---------------------------------------------------------------------------
# get_stop_search_stats
# ---------------------------------------------------------------------------

STOP_SEARCH_PAYLOAD = {
    "postcode": "SW1A1AA",
    "period_months": 3,
    "total": 2,
    "records": [],
    "source": "police.uk",
    "caveats": ["Example caveat."],
}


@pytest.mark.asyncio
async def test_get_stop_search_stats_success():
    from tools.stop_search import get_stop_search_stats

    mock_cm = _make_async_client(_make_response(200, STOP_SEARCH_PAYLOAD))
    with patch("tools.stop_search.httpx.AsyncClient", return_value=mock_cm):
        result = await get_stop_search_stats("SW1A1AA", 3, API_URL)

    assert result["total"] == 2
    assert "error" not in result


# ---------------------------------------------------------------------------
# compare_postcodes_list
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compare_postcodes_list_success():
    from tools.compare_list import compare_postcodes_list

    responses = [_make_response(200, REPORT_A), _make_response(200, REPORT_B)]
    call_count = 0

    async def mock_get(url, **kwargs):
        nonlocal call_count
        resp = responses[min(call_count, len(responses) - 1)]
        call_count += 1
        return resp

    client = MagicMock()
    client.get = mock_get
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch("tools.compare_list.httpx.AsyncClient", return_value=cm):
        result = await compare_postcodes_list(["SW1A1AA", "M11AE"], API_URL)

    assert len(result["items"]) == 2
    assert result["items"][0]["total_incidents"] == 150


# ---------------------------------------------------------------------------
# explain_dataset
# ---------------------------------------------------------------------------


def test_explain_dataset_crime():
    from tools.explain_dataset import explain_dataset

    result = explain_dataset("crime")
    assert result["topic"] == "crime"
    assert "police.uk" in result["source_url"]


def test_explain_dataset_invalid():
    from tools.explain_dataset import explain_dataset

    result = explain_dataset("unknown")
    assert "error" in result
