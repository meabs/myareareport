"""Tests for GET /report/{postcode} endpoint."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.area import Area
from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
from app.models.flood import FloodRiskSummary
from app.models.planning import PlanningApplication, PlanningSummary
from app.providers.postcodes_io import PostcodeNotFoundError

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

VALID_AREA = Area(
    postcode="SW1A 1AA",
    latitude=51.5010,
    longitude=-0.1415,
    admin_district="Westminster",
    admin_county=None,
    region="London",
    country="England",
)

VALID_CRIME = CrimeSummary(
    postcode="SW1A 1AA",
    period_months=12,
    total_incidents=42,
    top_categories=[CrimeCategorySummary(category="burglary", count=42)],
    monthly_trend=[MonthlyCount(month="2025-03", count=42)],
    summary="There were 42 incidents recorded over the past 12 months.",
    caveats=[
        "Crime data is published monthly and may lag behind current conditions.",
        "Reported incidents reflect reporting behaviour and policing patterns.",
        "This data should not be used as a real-time safety indicator.",
    ],
)

VALID_FLOOD = FloodRiskSummary(
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
    application_count=2,
    applications=[
        PlanningApplication(
            reference="MOCK/001/FUL",
            status="Pending",
            description="Residential development of 12 dwellings",
            address="Example Road",
            distance_km=1.2,
            decision_date=None,
            source="mock",
        ),
    ],
    summary="2 nearby planning applications were found within 2.0 km.",
    caveats=[
        "Planning data coverage varies by local authority.",
        "Some applications may be missing or delayed depending on council publication practices.",
    ],
)

# Patch targets
AREA_GET_PATCH = "app.services.report_service.AreaService.get_area"
CRIME_GET_PATCH = "app.services.report_service.CrimeService.get_crime_summary"
FLOOD_GET_PATCH = "app.services.report_service.FloodService.get_flood_summary"
PLANNING_GET_PATCH = "app.services.report_service.PlanningService.get_planning_summary"


# ---------------------------------------------------------------------------
# Test 1: Valid report — area and crime sections both available
# ---------------------------------------------------------------------------


def test_valid_report_area_and_crime_available() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CRIME_GET_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()

    assert data["postcode"] == "SW1A 1AA"

    assert data["area"]["status"] == "available"
    assert data["area"]["data"]["postcode"] == "SW1A 1AA"

    assert data["sections"]["crime"]["status"] == "available"
    assert data["sections"]["crime"]["data"]["total_incidents"] == 42


# ---------------------------------------------------------------------------
# Test 2: Flood section is "available"; planning is "available"
# ---------------------------------------------------------------------------


def test_flood_available_and_planning_available() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CRIME_GET_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()

    assert data["sections"]["flood"]["status"] == "available"
    assert data["sections"]["planning"]["status"] == "available"
    assert data["sections"]["flood"]["summary"] is not None
    assert data["sections"]["planning"]["summary"] is not None


# ---------------------------------------------------------------------------
# Test 3: Crime service failure — report still returns, crime status "unavailable"
# ---------------------------------------------------------------------------


def test_crime_failure_does_not_crash_report() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(
            CRIME_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=RuntimeError("crime service exploded"),
        ),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()

    assert data["sections"]["crime"]["status"] == "unavailable"
    assert data["sections"]["crime"]["summary"] is None
    assert data["sections"]["crime"]["data"] is None


# ---------------------------------------------------------------------------
# Test 4: Invalid postcode returns 404
# ---------------------------------------------------------------------------


def test_invalid_postcode_returns_404() -> None:
    with patch(
        AREA_GET_PATCH,
        new_callable=AsyncMock,
        side_effect=PostcodeNotFoundError("ZZ99ZZ"),
    ):
        response = client.get("/report/ZZ99ZZ")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "invalid_postcode"
    assert error["retryable"] is False


# ---------------------------------------------------------------------------
# Test 5: generated_at is timezone-aware (has tzinfo)
# ---------------------------------------------------------------------------


def test_generated_at_is_timezone_aware() -> None:
    from datetime import datetime

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CRIME_GET_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    generated_at_str = response.json()["generated_at"]
    dt = datetime.fromisoformat(generated_at_str)
    assert dt.tzinfo is not None


# ---------------------------------------------------------------------------
# Test 6: Sources list always includes postcodes.io
# ---------------------------------------------------------------------------


def test_sources_include_postcodes_io() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CRIME_GET_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    source_names = [s["name"] for s in response.json()["sources"]]
    assert "postcodes.io" in source_names


# ---------------------------------------------------------------------------
# Test 7a: Sources include police.uk when crime is available
# ---------------------------------------------------------------------------


def test_sources_include_police_uk_when_crime_available() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CRIME_GET_PATCH, new_callable=AsyncMock, return_value=VALID_CRIME),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    source_names = [s["name"] for s in response.json()["sources"]]
    assert "police.uk" in source_names


# ---------------------------------------------------------------------------
# Test 7b: Sources exclude police.uk when crime is unavailable
# ---------------------------------------------------------------------------


def test_sources_exclude_police_uk_when_crime_unavailable() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(
            CRIME_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=RuntimeError("crime service unavailable"),
        ),
        patch(FLOOD_GET_PATCH, new_callable=AsyncMock, return_value=VALID_FLOOD),
        patch(PLANNING_GET_PATCH, new_callable=AsyncMock, return_value=VALID_PLANNING),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    source_names = [s["name"] for s in response.json()["sources"]]
    assert "postcodes.io" in source_names
    assert "police.uk" not in source_names
