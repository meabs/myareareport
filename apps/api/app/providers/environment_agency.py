import asyncio
import math
from datetime import datetime

import httpx
import sentry_sdk

from app.models.flood import FloodStation, FloodWarning, RainfallGauge


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


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

            # Compute distance from station lat/lng vs query coordinates
            distance_km: float | None = None
            try:
                st_lat = float(str(item.get("lat", "")))
                st_lng = float(str(item.get("long", "")))
                distance_km = round(_haversine_km(lat, lng, st_lat, st_lng), 1)
            except (TypeError, ValueError):
                pass

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
        # Sort by distance so nearest comes first
        stations.sort(key=lambda s: s.distance_km if s.distance_km is not None else 999)
        return stations

    async def get_rainfall_gauges(
        self, lat: float, lng: float
    ) -> list[RainfallGauge]:
        """Fetch nearest rainfall gauge readings within 10 km.

        Returns up to 3 gauges with latest 15-minute rainfall (mm).
        """
        url = f"{self.BASE_URL}/id/stations"
        params: dict[str, float | int] = {"lat": lat, "long": lng, "dist": 10}
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
            raise EnvironmentAgencyProviderError(
                f"Unexpected status {response.status_code} from EA stations API"
            )

        items: list[dict] = response.json().get("items", [])

        # Find rainfall stations and their nearest measure IDs
        rainfall_candidates: list[tuple[float, str, str]] = []  # (dist_km, label, measure_id)
        for item in items:
            try:
                st_lat = float(str(item.get("lat", "")))
                st_lng = float(str(item.get("long", "")))
                dist_km = round(_haversine_km(lat, lng, st_lat, st_lng), 1)
            except (TypeError, ValueError):
                dist_km = 999.0

            label = str(item.get("label", "Unknown"))
            measures = item.get("measures")
            if isinstance(measures, dict):
                measures = [measures]
            if not isinstance(measures, list):
                continue
            for m in measures:
                if not isinstance(m, dict):
                    continue
                if str(m.get("parameterName", "")).lower() != "rainfall":
                    continue
                measure_id_url = str(m.get("@id", ""))
                if not measure_id_url:
                    continue
                measure_id = measure_id_url.rstrip("/").split("/")[-1]
                rainfall_candidates.append((dist_km, label, measure_id))
                break  # one measure per station is enough

        rainfall_candidates.sort(key=lambda c: c[0])
        nearest = rainfall_candidates[:3]

        if not nearest:
            return []

        # Fetch latest reading for each gauge in parallel
        async def _fetch_reading(
            dist_km: float, label: str, measure_id: str
        ) -> RainfallGauge:
            try:
                async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                    r = await client.get(
                        f"{self.BASE_URL}/id/measures/{measure_id}"
                    )
                if not r.is_success:
                    return RainfallGauge(
                        label=label, distance_km=dist_km,
                        latest_mm=None, timestamp=None
                    )
                reading_data = r.json().get("items", {})
                latest = reading_data.get("latestReading", {})
                latest_mm: float | None = None
                timestamp: datetime | None = None
                if isinstance(latest, dict):
                    raw_val = latest.get("value")
                    if raw_val is not None:
                        try:
                            latest_mm = float(str(raw_val))
                        except (TypeError, ValueError):
                            pass
                    raw_dt = latest.get("dateTime")
                    if raw_dt:
                        try:
                            timestamp = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
                        except ValueError:
                            pass
                return RainfallGauge(
                    label=label,
                    distance_km=dist_km,
                    latest_mm=latest_mm,
                    timestamp=timestamp,
                )
            except Exception:
                return RainfallGauge(
                    label=label, distance_km=dist_km,
                    latest_mm=None, timestamp=None
                )

        gauges = await asyncio.gather(
            *[_fetch_reading(d, l, m) for d, l, m in nearest]
        )
        return list(gauges)
