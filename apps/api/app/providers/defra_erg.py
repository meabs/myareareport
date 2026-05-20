import asyncio
import math

import httpx
import sentry_sdk

from app.models.air_quality import AirQualityReading, AirQualityStation

SITES_URL = (
    "https://api.erg.ic.ac.uk/AirQuality/Information/MonitoringSite/GroupName=AURN/Json"
)
READINGS_URL_TMPL = (
    "https://api.erg.ic.ac.uk/AirQuality/Daily/MonitoringIndex/Latest/SiteCode={code}/Json"
)

SPECIES_LABELS = {
    "NO2": "NO₂",
    "PM25": "PM2.5",
    "PM10": "PM10",
    "O3": "O₃",
    "SO2": "SO₂",
    "CO": "CO",
}

DAQI_BANDS = {
    1: "Low", 2: "Low", 3: "Low",
    4: "Moderate", 5: "Moderate", 6: "Moderate",
    7: "High", 8: "High", 9: "High",
    10: "Very High",
}


class DefraErgProviderTimeoutError(Exception):
    """Raised when the DEFRA ERG API times out."""


class DefraErgProviderError(Exception):
    """Raised when an unexpected error occurs contacting the DEFRA ERG API."""


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _parse_sites(data: dict) -> list[dict]:
    sites = data.get("Sites", {}).get("Site", [])
    if isinstance(sites, dict):
        sites = [sites]
    result = []
    for s in sites:
        code = s.get("@SiteCode", "")
        name = s.get("@SiteName", "")
        try:
            lat = float(s.get("@Latitude", ""))
            lng = float(s.get("@Longitude", ""))
        except (TypeError, ValueError):
            continue
        if not code or not lat or not lng:
            continue
        result.append({"code": code, "name": name, "lat": lat, "lng": lng})
    return result


def _parse_readings(data: dict) -> list[AirQualityReading]:
    readings: list[AirQualityReading] = []
    local_auths = data.get("DailyAirQualityIndex", {}).get("LocalAuthority", [])
    if isinstance(local_auths, dict):
        local_auths = [local_auths]
    for la in local_auths:
        sites = la.get("Site", [])
        if isinstance(sites, dict):
            sites = [sites]
        for site in sites:
            species_list = site.get("Species", [])
            if isinstance(species_list, dict):
                species_list = [species_list]
            bulletin_date = site.get("@BulletinDate")
            for sp in species_list:
                raw_index = sp.get("@AirQualityIndex", "0")
                try:
                    index = int(raw_index)
                except (TypeError, ValueError):
                    continue
                if index <= 0:
                    continue
                code = sp.get("@SpeciesCode", "")
                label = SPECIES_LABELS.get(code, code)
                readings.append(
                    AirQualityReading(
                        parameter=label,
                        value=float(index),
                        unit="DAQI",
                        last_updated=bulletin_date,
                    )
                )
    return readings


class DefraErgProvider:
    TIMEOUT = 8.0

    async def get_nearest_station(
        self, lat: float, lng: float
    ) -> AirQualityStation | None:
        """Fetch the nearest AURN monitoring station and its latest DAQI readings.

        Returns None if no stations found or all readings unavailable.
        Raises DefraErgProviderTimeoutError on timeout.
        Raises DefraErgProviderError on unexpected errors.
        """
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                sites_resp, _ = await asyncio.gather(
                    client.get(SITES_URL),
                    asyncio.sleep(0),  # keeps gather signature symmetric
                )
        except httpx.TimeoutException as exc:
            raise DefraErgProviderTimeoutError(
                "Request to DEFRA ERG sites API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise DefraErgProviderError(
                f"Unexpected error contacting DEFRA ERG API: {exc}"
            ) from exc

        if not sites_resp.is_success:
            err = RuntimeError(
                f"Unexpected status {sites_resp.status_code} from DEFRA ERG sites API"
            )
            sentry_sdk.capture_exception(err)
            raise DefraErgProviderError(str(err)) from err

        sites = _parse_sites(sites_resp.json())
        if not sites:
            return None

        # Find nearest site by haversine distance
        nearest = min(
            sites,
            key=lambda s: _haversine_km(lat, lng, s["lat"], s["lng"]),
        )
        distance_km = round(_haversine_km(lat, lng, nearest["lat"], nearest["lng"]), 1)

        # Fetch latest readings for the nearest site
        readings_url = READINGS_URL_TMPL.format(code=nearest["code"])
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                readings_resp = await client.get(readings_url)
        except httpx.TimeoutException as exc:
            raise DefraErgProviderTimeoutError(
                "Request to DEFRA ERG readings API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise DefraErgProviderError(
                f"Unexpected error contacting DEFRA ERG readings API: {exc}"
            ) from exc

        if not readings_resp.is_success:
            # Non-fatal: return station without readings rather than failing
            return AirQualityStation(
                name=nearest["name"],
                distance_km=distance_km,
                readings=[],
            )

        readings = _parse_readings(readings_resp.json())

        return AirQualityStation(
            name=nearest["name"],
            distance_km=distance_km,
            readings=readings,
        )
