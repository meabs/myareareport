"""Tests for GET /area/{postcode} endpoint."""

from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.models.area import Area

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

VALID_AREA = Area(
    postcode="CH1 4AB",
    latitude=53.1906,
    longitude=-2.8916,
    admin_district="Cheshire West and Chester",
    admin_county=None,
    region="North West",
    country="England",
)

# Simulated postcodes.io JSON response for a valid postcode
VALID_API_RESPONSE = {
    "status": 200,
    "result": {
        "postcode": "CH1 4AB",
        "latitude": 53.1906,
        "longitude": -2.8916,
        "admin_district": "Cheshire West and Chester",
        "admin_county": None,
        "region": "North West",
        "country": "England",
    },
}


def _mock_httpx_response(
    status_code: int, json_body: dict[str, object] | None = None
) -> httpx.Response:
    """Build a fake httpx.Response without making a real request."""
    import json

    content = json.dumps(json_body or {}).encode()
    return httpx.Response(status_code=status_code, content=content)


# ---------------------------------------------------------------------------
# Test 1: valid postcode returns 200 with canonical Area model
# ---------------------------------------------------------------------------


def test_valid_postcode_returns_200() -> None:
    mock_response = _mock_httpx_response(200, VALID_API_RESPONSE)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        response = client.get("/area/CH14AB")

    assert response.status_code == 200
    data = response.json()
    assert data["postcode"] == "CH1 4AB"
    assert data["country"] == "England"
    assert data["source"] == "postcodes.io"
    assert isinstance(data["latitude"], float)
    assert isinstance(data["longitude"], float)


# ---------------------------------------------------------------------------
# Test 2: lowercase / spaced input normalises correctly
# ---------------------------------------------------------------------------


def test_postcode_normalisation() -> None:
    mock_response = _mock_httpx_response(200, VALID_API_RESPONSE)

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        response = client.get("/area/ch1%204ab")  # "ch1 4ab" URL-encoded

    assert response.status_code == 200
    assert response.json()["postcode"] == "CH1 4AB"


# ---------------------------------------------------------------------------
# Test 3: invalid postcode → 404 with error.code == "invalid_postcode"
# ---------------------------------------------------------------------------


def test_invalid_postcode_returns_404() -> None:
    not_found_response = _mock_httpx_response(
        404, {"status": 404, "error": "Invalid postcode"}
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=not_found_response):
        response = client.get("/area/ZZ99ZZ")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "invalid_postcode"
    assert error["retryable"] is False


# ---------------------------------------------------------------------------
# Test 4: provider timeout → 503 with error.code == "provider_unavailable"
#          and retryable == True
# ---------------------------------------------------------------------------


def test_provider_timeout_returns_503() -> None:
    with patch(
        "httpx.AsyncClient.get",
        new_callable=AsyncMock,
        side_effect=httpx.TimeoutException("timed out"),
    ):
        response = client.get("/area/CH14AB")

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "provider_unavailable"
    assert error["retryable"] is True


# ---------------------------------------------------------------------------
# Test 5: unexpected provider exception → 503
# ---------------------------------------------------------------------------


def test_unexpected_provider_exception_returns_503() -> None:
    with (
        patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            side_effect=RuntimeError("boom"),
        ),
        patch("sentry_sdk.capture_exception"),  # ensure we don't need a real DSN
    ):
        response = client.get("/area/CH14AB")

    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "provider_unavailable"
