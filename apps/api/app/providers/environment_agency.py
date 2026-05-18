from datetime import datetime

import httpx
import sentry_sdk

from app.models.flood import FloodStation, FloodWarning


class EnvironmentAgencyProviderTimeoutError(Exception):
    """Raised when the Environment Agency API times out."""


class EnvironmentAgencyProviderError(Exception):
    """Raised when an unexpected error occurs contacting the Environment Agency API."""


SEVERITY_MAP = {
    1: "Severe Flood Warning",
    2: "Flood Warning",
    3: "Flood Alert",
}


class EnvironmentAgencyProvider:
    BASE_URL = "https://environment.data.gov.uk/flood-monitoring"
    TIMEOUT = 8.0

    async def get_flood_warnings(self, lat: float, lng: float) -> list[FloodWarning]:
        """Fetch active flood warnings near the given coordinates (within 5 km).

        Returns a list of FloodWarning objects.
        Raises EnvironmentAgencyProviderTimeoutError on timeout.
        Raises EnvironmentAgencyProviderError on unexpected errors.
        """
        url = f"{self.BASE_URL}/id/floods"
        params: dict[str, float | int] = {"lat": lat, "long": lng, "dist": 5}
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise EnvironmentAgencyProviderTimeoutError(
                "Request to Environment Agency flood API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise EnvironmentAgencyProviderError(
                f"Unexpected error contacting Environment Agency flood API: {exc}"
            ) from exc

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from Environment Agency flood API"
            )
            sentry_sdk.capture_exception(err)
            raise EnvironmentAgencyProviderError(str(err)) from err

        items: list[dict[str, object]] = response.json().get("items", [])
        warnings: list[FloodWarning] = []
        for item in items:
            raw_severity = item.get("severityLevel", 4)
            try:
                severity_level = int(str(raw_severity))
            except (TypeError, ValueError):
                severity_level = 4
            # Skip noLongerInForce (4)
            if severity_level not in SEVERITY_MAP:
                continue
            severity_label = SEVERITY_MAP[severity_level]
            flood_area = item.get("floodArea", {})
            if isinstance(flood_area, dict):
                area_label = str(flood_area.get("label", ""))
            else:
                area_label = ""
            message = str(item.get("message", ""))
            warnings.append(
                FloodWarning(
                    severity=severity_label,
                    message=message,
                    area=area_label,
                )
            )
        return warnings

    async def get_flood_stations(self, lat: float, lng: float) -> list[FloodStation]:
        """Fetch nearest flood monitoring stations within 5 km.

        Returns a list of FloodStation objects.
        Raises EnvironmentAgencyProviderTimeoutError on timeout.
        Raises EnvironmentAgencyProviderError on unexpected errors.
        """
        url = f"{self.BASE_URL}/id/stations"
        params: dict[str, float | int] = {"lat": lat, "long": lng, "dist": 5}
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise EnvironmentAgencyProviderTimeoutError(
                "Request to Environment Agency stations API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise EnvironmentAgencyProviderError(
                f"Unexpected error contacting Environment Agency stations API: {exc}"
            ) from exc

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from Environment Agency stations API"
            )
            sentry_sdk.capture_exception(err)
            raise EnvironmentAgencyProviderError(str(err)) from err

        items: list[dict[str, object]] = response.json().get("items", [])
        stations: list[FloodStation] = []
        for item in items:
            label = str(item.get("label", "Unknown"))

            # Distance: not directly provided by the API — leave as None
            distance_km: float | None = None

            # Latest reading from first measure
            latest_level_m: float | None = None
            timestamp_str: str | None = None

            measures = item.get("measures")
            if isinstance(measures, list) and measures:
                first_measure = measures[0]
                if isinstance(first_measure, dict):
                    latest_reading = first_measure.get("latestReading")
                    if isinstance(latest_reading, dict):
                        raw_value = latest_reading.get("value")
                        if raw_value is not None:
                            try:
                                latest_level_m = float(str(raw_value))
                            except (TypeError, ValueError):
                                pass
                        raw_dt = latest_reading.get("dateTime")
                        if raw_dt is not None:
                            timestamp_str = str(raw_dt)

            parsed_timestamp: datetime | None = None
            if timestamp_str:
                try:
                    parsed_timestamp = datetime.fromisoformat(timestamp_str)
                except ValueError:
                    pass

            stations.append(
                FloodStation(
                    label=label,
                    distance_km=distance_km,
                    latest_level_m=latest_level_m,
                    timestamp=parsed_timestamp,
                )
            )
        return stations
