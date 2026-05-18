"""Tests for planning applications functionality (Stage 6)."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.area import Area
from app.models.planning import PlanningApplication, PlanningSummary
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError

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

MOCK_APP_1 = PlanningApplication(
    reference="MOCK/001/FUL",
    status="Pending",
    description="Residential development of 12 dwellings",
    address="Example Road",
    distance_km=1.2,
    decision_date=None,
    source="mock",
)

MOCK_APP_2 = PlanningApplication(
    reference="MOCK/002/OUT",
    status="Approved",
    description="Outline planning: mixed use",
    address="High Street",
    distance_km=0.8,
    decision_date=None,
    source="mock",
)

VALID_PLANNING_SUMMARY = PlanningSummary(
    postcode="SW1A1AA",
    radius_km=2.0,
    application_count=2,
    applications=[MOCK_APP_1, MOCK_APP_2],
    summary="2 nearby planning applications were found within 2.0 km.",
    caveats=[
        "Planning data coverage varies by local authority.",
        "Some applications may be missing or delayed depending on council publication practices.",
    ],
)

# Patch targets for /planning endpoint
AREA_GET_PATCH = "app.services.planning_service.AreaService.get_area"
LIVE_PROVIDER_PATCH = "app.services.planning_service.PlanningDataGovUkProvider.get_applications"
MOCK_PROVIDER_PATCH = "app.services.planning_service.MockPlanningProvider.get_applications"
CACHE_GET_PATCH = "app.services.planning_service.get_cached"
CACHE_SET_PATCH = "app.services.planning_service.set_cached"

# Patch targets for /report endpoint
REPORT_AREA_PATCH = "app.services.report_service.AreaService.get_area"
REPORT_CRIME_PATCH = "app.services.report_service.CrimeService.get_crime_summary"
REPORT_FLOOD_PATCH = "app.services.report_service.FloodService.get_flood_summary"
REPORT_PLANNING_PATCH = "app.services.report_service.PlanningService.get_planning_summary"


# ---------------------------------------------------------------------------
# Test 1: No applications → summary contains "No nearby planning applications"
# ---------------------------------------------------------------------------


def test_no_applications_summary() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(LIVE_PROVIDER_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(MOCK_PROVIDER_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/planning/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert "No nearby planning applications" in data["summary"]
    assert data["application_count"] == 0
    assert data["applications"] == []


# ---------------------------------------------------------------------------
# Test 2: Multiple applications → application_count correct, summary correct
# ---------------------------------------------------------------------------


def test_multiple_applications_count_and_summary() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(
            LIVE_PROVIDER_PATCH,
            new_callable=AsyncMock,
            return_value=[MOCK_APP_1, MOCK_APP_2],
        ),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/planning/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert data["application_count"] == 2
    assert len(data["applications"]) == 2
    assert "2 nearby planning applications" in data["summary"]


# ---------------------------------------------------------------------------
# Test 3: Provider unavailable → 503 with retryable == True
# ---------------------------------------------------------------------------


def test_provider_unavailable_returns_503() -> None:
    with (
        patch(
            AREA_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=ProviderUnavailableError("postcodes.io down"),
        ),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/planning/SW1A1AA")

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["retryable"] is True
    assert error["code"] == "provider_unavailable"


# ---------------------------------------------------------------------------
# Test 4: Radius validation — radius_km > 10 returns 422
# ---------------------------------------------------------------------------


def test_radius_too_large_returns_422() -> None:
    response = client.get("/planning/SW1A1AA?radius_km=15")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test 4b: Radius validation — radius_km < 0.5 returns 422
# ---------------------------------------------------------------------------


def test_radius_too_small_returns_422() -> None:
    response = client.get("/planning/SW1A1AA?radius_km=0.1")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Test 5: Report integration — planning available → status "available" in /report
# ---------------------------------------------------------------------------


def test_report_planning_available() -> None:
    from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
    from app.models.flood import FloodRiskSummary

    valid_crime = CrimeSummary(
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
    valid_flood = FloodRiskSummary(
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

    with (
        patch(REPORT_AREA_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(REPORT_CRIME_PATCH, new_callable=AsyncMock, return_value=valid_crime),
        patch(REPORT_FLOOD_PATCH, new_callable=AsyncMock, return_value=valid_flood),
        patch(
            REPORT_PLANNING_PATCH,
            new_callable=AsyncMock,
            return_value=VALID_PLANNING_SUMMARY,
        ),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    planning = data["sections"]["planning"]
    assert planning["status"] == "available"
    assert planning["data"] is not None
    assert planning["summary"] is not None
    source_names = [s["name"] for s in data["sources"]]
    assert "planning.data.gov.uk" in source_names


# ---------------------------------------------------------------------------
# Test 6: Report integration — planning failure → status "unavailable", no crash
# ---------------------------------------------------------------------------


def test_report_planning_unavailable_does_not_crash() -> None:
    from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
    from app.models.flood import FloodRiskSummary

    valid_crime = CrimeSummary(
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
    valid_flood = FloodRiskSummary(
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

    with (
        patch(REPORT_AREA_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(REPORT_CRIME_PATCH, new_callable=AsyncMock, return_value=valid_crime),
        patch(REPORT_FLOOD_PATCH, new_callable=AsyncMock, return_value=valid_flood),
        patch(
            REPORT_PLANNING_PATCH,
            new_callable=AsyncMock,
            side_effect=RuntimeError("planning service exploded"),
        ),
    ):
        response = client.get("/report/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    planning = data["sections"]["planning"]
    assert planning["status"] == "unavailable"
    assert planning["summary"] is None
    assert planning["data"] is None
    source_names = [s["name"] for s in data["sources"]]
    assert "planning.data.gov.uk" not in source_names


# ---------------------------------------------------------------------------
# Test 7: Caveats included in response
# ---------------------------------------------------------------------------


def test_caveats_included_in_response() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(
            LIVE_PROVIDER_PATCH,
            new_callable=AsyncMock,
            return_value=[MOCK_APP_1, MOCK_APP_2],
        ),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/planning/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    caveats = data["caveats"]
    assert len(caveats) == 2
    assert "Planning data coverage varies by local authority." in caveats
    assert any("council publication" in c for c in caveats)


# ---------------------------------------------------------------------------
# Test 8: Invalid postcode returns 404
# ---------------------------------------------------------------------------


def test_invalid_postcode_returns_404() -> None:
    with patch(
        AREA_GET_PATCH,
        new_callable=AsyncMock,
        side_effect=PostcodeNotFoundError("ZZ99ZZ"),
    ):
        response = client.get("/planning/ZZ99ZZ")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "invalid_postcode"
    assert error["retryable"] is False


# ---------------------------------------------------------------------------
# Test 9: Live provider fallback to mock when live returns empty
# ---------------------------------------------------------------------------


def test_live_provider_empty_falls_back_to_mock() -> None:
    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(CACHE_GET_PATCH, new_callable=AsyncMock, return_value=None),
        patch(LIVE_PROVIDER_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(
            MOCK_PROVIDER_PATCH,
            new_callable=AsyncMock,
            return_value=[MOCK_APP_1, MOCK_APP_2],
        ),
        patch(CACHE_SET_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/planning/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert data["application_count"] == 2
    assert all(a["source"] == "mock" for a in data["applications"])
