"""Tests for GET /crime/{postcode} endpoint."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.area import Area
from app.providers.police_uk import PoliceUkProviderTimeoutError
from app.providers.postcodes_io import PostcodeNotFoundError

client = TestClient(app)

# ---------------------------------------------------------------------------
# Shared fixtures / helpers
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

# Incident batches used across tests
INCIDENT_BATCH_A = [
    {"category": "burglary", "month": "2025-03"},
    {"category": "burglary", "month": "2025-03"},
    {"category": "vehicle-crime", "month": "2025-03"},
]

INCIDENT_BATCH_B = [
    {"category": "burglary", "month": "2025-04"},
    {"category": "theft-from-the-person", "month": "2025-04"},
]

# ---------------------------------------------------------------------------
# Patch targets
# ---------------------------------------------------------------------------

# Mock AreaService at the service layer to avoid httpx for postcode lookups
AREA_GET_PATCH = "app.services.crime_service.AreaService.get_area"
# Mock PoliceUkProvider at the method level
POLICE_GET_PATCH = "app.providers.police_uk.PoliceUkProvider.get_street_crime"

MONTHS_PATCH = "app.services.crime_service._months_to_query"
GET_CACHED_PATCH = "app.services.crime_service.get_cached"
SET_CACHED_PATCH = "app.services.crime_service.set_cached"


# ---------------------------------------------------------------------------
# Test 1: valid postcode returns CrimeSummary with correct structure
# ---------------------------------------------------------------------------


def test_valid_postcode_returns_crime_summary() -> None:
    months = ["2025-03"]

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(POLICE_GET_PATCH, new_callable=AsyncMock, return_value=INCIDENT_BATCH_A),
        patch(MONTHS_PATCH, return_value=months),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=None),
        patch(SET_CACHED_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/crime/SW1A1AA?months=1")

    assert response.status_code == 200
    data = response.json()
    assert data["postcode"] == "SW1A 1AA"
    assert data["period_months"] == 1
    assert isinstance(data["total_incidents"], int)
    assert isinstance(data["top_categories"], list)
    assert isinstance(data["monthly_trend"], list)
    assert data["source"] == "police.uk"
    assert data["updated_frequency"] == "Monthly"
    assert len(data["caveats"]) == 3


# ---------------------------------------------------------------------------
# Test 2: empty crime result returns total_incidents == 0
# ---------------------------------------------------------------------------


def test_empty_crime_returns_zero_incidents() -> None:
    months = ["2025-03"]

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(POLICE_GET_PATCH, new_callable=AsyncMock, return_value=[]),
        patch(MONTHS_PATCH, return_value=months),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=None),
        patch(SET_CACHED_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/crime/SW1A1AA?months=1")

    assert response.status_code == 200
    data = response.json()
    assert data["total_incidents"] == 0
    assert data["top_categories"] == []
    assert data["monthly_trend"] == [{"month": "2025-03", "count": 0}]


# ---------------------------------------------------------------------------
# Test 3: category aggregation is correct
# ---------------------------------------------------------------------------


def test_category_aggregation() -> None:
    months = ["2025-03", "2025-04"]

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(
            POLICE_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=[INCIDENT_BATCH_A, INCIDENT_BATCH_B],
        ),
        patch(MONTHS_PATCH, return_value=months),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=None),
        patch(SET_CACHED_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/crime/SW1A1AA?months=2")

    assert response.status_code == 200
    data = response.json()

    # burglary: 2 (March) + 1 (April) = 3 → top
    assert data["total_incidents"] == 5
    cats = {c["category"]: c["count"] for c in data["top_categories"]}
    assert cats["burglary"] == 3
    assert cats["vehicle-crime"] == 1
    assert cats["theft-from-the-person"] == 1
    assert data["top_categories"][0]["category"] == "burglary"


# ---------------------------------------------------------------------------
# Test 4: monthly trend aggregation is correct
# ---------------------------------------------------------------------------


def test_monthly_trend_aggregation() -> None:
    months = ["2025-03", "2025-04"]

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(
            POLICE_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=[INCIDENT_BATCH_A, INCIDENT_BATCH_B],
        ),
        patch(MONTHS_PATCH, return_value=months),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=None),
        patch(SET_CACHED_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/crime/SW1A1AA?months=2")

    assert response.status_code == 200
    trend = response.json()["monthly_trend"]

    assert len(trend) == 2
    # Ascending order (oldest first)
    assert trend[0]["month"] == "2025-03"
    assert trend[0]["count"] == 3  # INCIDENT_BATCH_A has 3 items
    assert trend[1]["month"] == "2025-04"
    assert trend[1]["count"] == 2  # INCIDENT_BATCH_B has 2 items


# ---------------------------------------------------------------------------
# Test 5: cache hit returns result without calling provider
# ---------------------------------------------------------------------------


def test_cache_hit_skips_provider() -> None:
    cached_summary = {
        "postcode": "SW1A 1AA",
        "period_months": 12,
        "total_incidents": 42,
        "top_categories": [{"category": "burglary", "count": 42}],
        "monthly_trend": [],
        "source": "police.uk",
        "updated_frequency": "Monthly",
        "caveats": [
            "Crime data is published monthly and may lag behind current conditions.",
            "Reported incidents reflect reporting behaviour and policing patterns.",
            "This data should not be used as a real-time safety indicator.",
        ],
    }

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=cached_summary),
        patch(POLICE_GET_PATCH, new_callable=AsyncMock) as mock_police,
    ):
        response = client.get("/crime/SW1A1AA")

    assert response.status_code == 200
    data = response.json()
    assert data["total_incidents"] == 42
    # Provider must NOT have been called
    mock_police.assert_not_called()


# ---------------------------------------------------------------------------
# Test 6: provider timeout returns 503 with retryable == True
# ---------------------------------------------------------------------------


def test_provider_timeout_returns_503() -> None:
    months = ["2025-03"]

    with (
        patch(AREA_GET_PATCH, new_callable=AsyncMock, return_value=VALID_AREA),
        patch(
            POLICE_GET_PATCH,
            new_callable=AsyncMock,
            side_effect=PoliceUkProviderTimeoutError("timed out"),
        ),
        patch(MONTHS_PATCH, return_value=months),
        patch(GET_CACHED_PATCH, new_callable=AsyncMock, return_value=None),
        patch(SET_CACHED_PATCH, new_callable=AsyncMock),
    ):
        response = client.get("/crime/SW1A1AA?months=1")

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "provider_unavailable"
    assert error["retryable"] is True


# ---------------------------------------------------------------------------
# Test 7: invalid postcode returns 404
# ---------------------------------------------------------------------------


def test_invalid_postcode_returns_404() -> None:
    with patch(AREA_GET_PATCH, new_callable=AsyncMock, side_effect=PostcodeNotFoundError("ZZ99ZZ")):
        response = client.get("/crime/ZZ99ZZ")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "invalid_postcode"
    assert error["retryable"] is False
