"""Tests for flood risk functionality (Stage 5)."""

from datetime import UTC
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.area import Area
from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
from app.models.flood import FloodRiskSummary, FloodStation, FloodWarning
from app.models.planning import PlanningSummary
from app.providers.environment_agency import (
    EnvironmentAgencyProviderTimeoutError,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

VALID_AREA = Area(
    postcode="SW1A1AA",
    latitude=51.5010,
    longitude=-0.1415,
    admin_district="Westminster",
    admin_county=None,
    region="London",
    country="England",
)

VALID_CRIME = CrimeSummary(
    postcode="SW1A1AA",
    period_months=12,
    total_incidents=10,
    top_categories=[CrimeCategorySummary(category="burglary", count=10)],
    monthly_trend=[MonthlyCount(month="2025-03", count=10)],
    summary="There were 10 incidents recorded over the past 12 months.",
    caveats=[
        "Crime data is published monthly and may lag behind current conditions.",
        "Reported incidents reflect reporting behaviour and policing patterns.",
        "This data should not be used as a real-time safety indicator.",
    ],
)

VALID_FLOOD_SUMMARY = FloodRiskSummary(
    postcode="SW1A1AA",
    current_warnings=[
        FloodWarning(
            severity="Flood Alert",
            message="River levels are rising.",
            area="Lower Thames",
        )
    ],
    nearest_stations=[
        FloodStation(
            label="Thames at Teddington",
            distance_km=None,
            latest_level_m=1.23,
            timestamp=None,
        )
    ],
    summary="There is 1 active flood Flood Alert near this postcode.",
    caveats=[
        "Flood data can change quickly.",
        "Use official flood warning services for current emergency information.",
        "This service is not insurance or emergency advice.",
    ],
)

NO_WARNINGS_FLOOD_SUMMARY = FloodRiskSummary(
    postcode="SW1A1AA",
    current_warnings=[],
    nearest_stations=[],
    summary="No current flood warnings were found near this postcode.",
    caveats=[
        "Flood data can change quickly.",
        "Use official flood warning services for current emergency information.",
        "This service is not insurance or emergency advice.",
    ],
)

VALID_PLANNING = PlanningSummary(
    postcode="SW1A1AA",
    radius_km=2.0,
    application_count=0,
    applications=[],
    summary="No nearby planning applications were found within 2.0 km.",
    caveats=[
        "Planning data coverage varies by local authority.",
        "Some applications may be missing or delayed depending on council publication practices.",
    ],
)

# Patch targets
AREA_GET_PATCH = "app.services.flood_service.AreaService.get_area"
WARNINGS_PATCH = "app.services.flood_service.EnvironmentAgencyProvider.get_flood_warnings"
STATIONS_PATCH = "app.services.flood_service.EnvironmentAgencyProvider.get_flood_stations"
CACHE_GET_PATCH = "app.services.flood_service.get_cached"
CACHE_SET_PATCH = "app.services.flood_service.set_cached"

REPORT_AREA_PATCH = "app.services.report_service.AreaService.get_area"
REPORT_CRIME_PATCH = "app.services.report_service.CrimeService.get_crime_summary"
REPORT_FLOOD_PATCH = "app.services.report_service.FloodService.get_flood_summary"
REPORT_PLANNING_PATCH = "app.services.report_service.PlanningService.get_planning_summary"


# ---------------------------------------------------------------------------
# Test 1: No warnings response → summary contains "No current flood warnings"
# ---------------------------------------------------------------------------


def test_no_warnings_summary() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(WARNINGS_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(STATIONS_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/flood/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert "No current flood warnings" in data["summary"]
    assert data["current_warnings"] == []


# ---------------------------------------------------------------------------
# Test 2: Active warning response → warning parsed correctly, summary mentions "active"
# ---------------------------------------------------------------------------


def test_active_warning_parsed_correctly() -> None:
    warning = FloodWarning(
        severity="Flood Warning",
        message="Flooding is expected.",
        area="River Severn at Upton",
    )
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(WARNINGS_PATCH, new_callable=AsyncMock, return_value=[warning]),
        patch(STATIONS_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/flood/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert "active" in data["summary"]
    assert len(data["current_warnings"]) == 1
    w = data["current_warnings"][0]
    assert w["severity"] == "Flood Warning"
    assert w["message"] == "Flooding is expected."
    assert w["area"] == "River Severn at Upton"
    assert w["source"] == "Environment Agency"


# ---------------------------------------------------------------------------
# Test 3: Station parsing works — latest_level_m populated
# ---------------------------------------------------------------------------


def test_station_parsing_latest_level_m() -> None:
    from datetime import datetime

    station = FloodStation(
        label="Thames at Richmond",
        distance_km=None,
        latest_level_m=2.45,
        timestamp=datetime(2024, 1, 15, 12, 0, 0, tzinfo=UTC),
    )
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(WARNINGS_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(STATIONS_PATCH, new_callable=AsyncMock, return_value=[station]),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/flood/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert len(data["nearest_stations"]) == 1
    s = data["nearest_stations"][0]
    assert s["label"] == "Thames at Richmond"
    assert s["latest_level_m"] == pytest.approx(2.45)


# ---------------------------------------------------------------------------
# Test 4: Provider timeout → 503 with retryable == True
# ---------------------------------------------------------------------------


def test_provider_timeout_returns_503() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(
            WARNINGS_PATCH,
            new_callable=AsyncMock,
            side_effect=EnvironmentAgencyProviderTimeoutError("timed out"),
        ),
        patch(STATIONS_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/flood/SW1A1AA")

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["retryable"] is True
    assert error["code"] == "provider_unavailable"


# ---------------------------------------------------------------------------
# Test 5: Report integration — flood available → status "available" in /report
# ---------------------------------------------------------------------------


def test_report_flood_available() -> None:
    with (
        patch(REPORT_AREA_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(REPORT_CRIME_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(REPORT_FLOOD_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD_SUMMARY),
        patch(REPORT_PLANNING_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    flood = data["sections"]["flood"]
    assert flood["status"] == "available"
    assert flood["data"] is not None
    assert "active" in flood["summary"]
    source_names = [s["name"] for s in data["sources"]]
    assert "Environment Agency" in source_names


# ---------------------------------------------------------------------------
# Test 6: Report integration — flood service failure → status "unavailable", no crash
# ---------------------------------------------------------------------------


def test_report_flood_unavailable_does_not_crash() -> None:
    with (
        patch(REPORT_AREA_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(REPORT_CRIME_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(
            REPORT_FLOOD_PATCH,
            new_callable=AsyncMock,
            side_effect=RuntimeError("flood service exploded"),
        ),
        patch(REPORT_PLANNING_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    flood = data["sections"]["flood"]
    assert flood["status"] == "unavailable"
    assert flood["summary"] is None
    assert flood["data"] is None
    source_names = [s["name"] for s in data["sources"]]
    assert "Environment Agency" not in source_names


# ---------------------------------------------------------------------------
# Test 7: Cache behaviour — cache hit avoids provider call
# ---------------------------------------------------------------------------


def test_cache_hit_avoids_provider_call() -> None:
    cached_data = NO_WARNINGS_FLOOD_SUMMARY.model_dump()
    # Convert datetime fields to strings for JSON compatibility
    for station in cached_data.get("nearest_stations", []):
        if station.get("timestamp") is not None:
            station["timestamp"] = str(station["timestamp"])

    warnings_mock = AsyncMock(return_value=[])
    stations_mock = AsyncMock(return_value=[])

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=cached_data),
        patch(WARNINGS_PATCH, warnings_mock),
        patch(STATIONS_PATCH, stations_mock),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/flood/SW1A1AA")

    assert response.status_code == 200
    warnings_mock.assert_not_called()
    stations_mock.assert_not_called()
