import math
from datetime import UTC, datetime, timedelta

import httpx
import sentry_sdk

from app.models.air_quality import AirQualityReading, AirQualityStation

BASE_URL = "https://data.sensor.community/airrohr/v1/filter/area"
TIMEOUT = 8.0
SEARCH_RADIUS_KM = 30
STALE_HOURS = 2


class SensorCommunityProviderTimeoutError(Exception):
    """Raised when the Sensor.Community API times out."""


class SensorCommunityProviderError(Exception):
    """Raised when an unexpected error occurs contacting the Sensor.Community API."""


# UK DAQI PM2.5 bands (µg/m³)
PM25_DAQI = [
    (11.0, "Low", 1),
    (23.0, "Low", 4),
    (35.0, "Moderate", 6),
    (53.0, "High", 7),
    (70.0, "High", 9),
    (float("inf"), "Very High", 10),
]


def _daqi_from_pm25(value: float) -> tuple[str, int]:
    for threshold, label, index in PM25_DAQI:
        if value <= threshold:
            return label, index
    return "Very High", 10


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


class SensorCommunityProvider:
    async def get_nearest_station(
        self, lat: float, lng: float
    ) -> AirQualityStation | None:
        """Fetch the nearest Sensor.Community sensor with PM2.5/PM10 readings.

        Searches within SEARCH_RADIUS_KM km, returns None if nothing found.
        Raises SensorCommunityProviderTimeoutError on timeout.
        Raises SensorCommunityProviderError on unexpected errors.
        """
        url = f"{BASE_URL}={lat},{lng},{SEARCH_RADIUS_KM}"
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.get(url)
        except httpx.TimeoutException as exc:
            raise SensorCommunityProviderTimeoutError(
                "Request to Sensor.Community API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise SensorCommunityProviderError(
                f"Unexpected error contacting Sensor.Community API: {exc}"
            ) from exc

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from Sensor.Community API"
            )
            sentry_sdk.capture_exception(err)
            raise SensorCommunityProviderError(str(err)) from err

        sensors: list[dict] = response.json()
        stale_cutoff = datetime.now(UTC) - timedelta(hours=STALE_HOURS)

        # Find sensors with PM2.5 readings, sorted by distance
        candidates = []
        for sensor in sensors:
            loc = sensor.get("location", {})
            try:
                slat = float(loc.get("latitude", 0))
                slng = float(loc.get("longitude", 0))
                if not slat or not slng:
                    continue
                dist_km = _haversine_km(lat, lng, slat, slng)
            except (TypeError, ValueError):
                continue

            # Check for PM readings
            pm25: float | None = None
            pm10: float | None = None
            ts_raw = sensor.get("timestamp", "")
            for dv in sensor.get("sensordatavalues", []):
                vt = dv.get("value_type", "")
                try:
                    v = float(dv.get("value", ""))
                except (TypeError, ValueError):
                    continue
                if vt == "P2":
                    pm25 = v
                elif vt == "P1":
                    pm10 = v

            if pm25 is None:
                continue

            # Check freshness
            last_updated: datetime | None = None
            if ts_raw:
                try:
                    last_updated = datetime.fromisoformat(
                        str(ts_raw).replace("Z", "+00:00")
                    )
                    if last_updated.tzinfo is None:
                        last_updated = last_updated.replace(tzinfo=UTC)
                    if last_updated < stale_cutoff:
                        continue
                except ValueError:
                    pass

            candidates.append((dist_km, pm25, pm10, last_updated))

        if not candidates:
            return None

        candidates.sort(key=lambda c: c[0])
        dist_km, pm25, pm10, last_updated = candidates[0]

        aqi_label, aqi_index = _daqi_from_pm25(pm25)

        readings: list[AirQualityReading] = [
            AirQualityReading(
                parameter="pm25",
                value=round(pm25, 1),
                unit="µg/m³",
                last_updated=last_updated,
            )
        ]
        if pm10 is not None:
            readings.append(
                AirQualityReading(
                    parameter="pm10",
                    value=round(pm10, 1),
                    unit="µg/m³",
                    last_updated=last_updated,
                )
            )

        return AirQualityStation(
            name=f"Sensor {round(dist_km, 1)} km away",
            distance_km=round(dist_km, 1),
            readings=readings,
        )
