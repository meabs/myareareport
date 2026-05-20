from datetime import datetime

import httpx
import sentry_sdk

from app.models.air_quality import AirQualityReading, AirQualityStation


class OpenAQProviderTimeoutError(Exception):
    """Raised when the OpenAQ API times out."""


class OpenAQProviderError(Exception):
    """Raised when an unexpected error occurs contacting the OpenAQ API."""


TRACKED_PARAMS = {"pm25", "no2", "o3", "pm10"}


class OpenAQProvider:
    BASE_URL = "https://api.openaq.org/v2/latest"
    TIMEOUT = 8.0

    async def get_nearest_station(
        self, lat: float, lng: float
    ) -> AirQualityStation | None:
        """Fetch the nearest air quality monitoring station and its latest readings.

        Returns the nearest station with readings, or None if no stations found.
        Raises OpenAQProviderTimeoutError on timeout.
        Raises OpenAQProviderError on unexpected errors.
        """
        params = {
            "coordinates": f"{lat},{lng}",
            "radius": 25000,
            "order_by": "distance",
            "limit": 5,
        }
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise OpenAQProviderTimeoutError(
                "Request to OpenAQ API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise OpenAQProviderError(
                f"Unexpected error contacting OpenAQ API: {exc}"
            ) from exc

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from OpenAQ API"
            )
            sentry_sdk.capture_exception(err)
            raise OpenAQProviderError(str(err)) from err

        results: list[dict] = response.json().get("results", [])
        for result in results:
            measurements: list[dict] = result.get("measurements", [])
            readings: list[AirQualityReading] = []
            for m in measurements:
                param = str(m.get("parameter", "")).lower()
                if param not in TRACKED_PARAMS:
                    continue
                raw_value = m.get("value")
                if raw_value is None:
                    continue
                try:
                    value = float(raw_value)
                except (TypeError, ValueError):
                    continue
                last_updated: datetime | None = None
                raw_dt = m.get("lastUpdated")
                if raw_dt:
                    try:
                        last_updated = datetime.fromisoformat(
                            str(raw_dt).replace("Z", "+00:00")
                        )
                    except ValueError:
                        pass
                readings.append(
                    AirQualityReading(
                        parameter=param,
                        value=value,
                        unit=str(m.get("unit", "µg/m³")),
                        last_updated=last_updated,
                    )
                )

            if not readings:
                continue

            distance_m = result.get("distance")
            distance_km: float | None = None
            if distance_m is not None:
                try:
                    distance_km = round(float(distance_m) / 1000, 1)
                except (TypeError, ValueError):
                    pass

            name = str(result.get("location") or result.get("city") or "Unknown")
            return AirQualityStation(
                name=name,
                distance_km=distance_km,
                readings=readings,
            )

        return None
