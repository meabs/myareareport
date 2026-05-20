import logging

from app.cache.redis_cache import get_cached, set_cached
from app.models.air_quality import AirQualitySummary
from app.providers.sensor_community import (
    SensorCommunityProvider,
    _daqi_from_pm25,
)
from app.services.area_service import AreaService, normalise_postcode

logger = logging.getLogger(__name__)

CACHE_TTL = 1800  # 30 minutes — sensor readings update every few minutes

CAVEATS = [
    "PM2.5/PM10 readings from Sensor.Community citizen science network.",
    "Readings are from the nearest available sensor and may not reflect local conditions.",
    "DAQI band is estimated from PM2.5. Not an official government measurement.",
]


class AirQualityService:
    def __init__(
        self,
        provider: SensorCommunityProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or SensorCommunityProvider()
        self._area_service = area_service or AreaService()

    async def get_air_quality(self, raw_postcode: str) -> AirQualitySummary:
        """Return an AirQualitySummary for the given postcode.

        Raises PostcodeNotFoundError / ProviderUnavailableError from AreaService.
        Raises SensorCommunityProviderTimeoutError / SensorCommunityProviderError from provider.
        """
        normalised = normalise_postcode(raw_postcode)

        area = await self._area_service.get_area(normalised)

        cache_key = f"air_quality:{normalised}"
        cached = await get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for %s", cache_key)
            return AirQualitySummary.model_validate(cached)

        station = await self._provider.get_nearest_station(area.latitude, area.longitude)

        if station and station.readings:
            pm25 = next((r for r in station.readings if r.parameter == "pm25"), None)
            if pm25:
                aqi_label, aqi_index = _daqi_from_pm25(pm25.value)
                dist_str = (
                    f" from a sensor {station.distance_km} km away"
                    if station.distance_km is not None
                    else ""
                )
                summary = (
                    f"Air quality appears {aqi_label.lower()} (PM2.5: {pm25.value} µg/m³{dist_str})."
                )
            else:
                aqi_label = "Unknown"
                aqi_index = None
                summary = "Air quality sensor found nearby but no PM2.5 reading available."
        else:
            aqi_label = "Unknown"
            aqi_index = None
            summary = "No air quality sensors found within 30 km of this postcode."

        result = AirQualitySummary(
            postcode=normalised,
            nearest_station=station,
            aqi_label=aqi_label,
            aqi_index=aqi_index,
            summary=summary,
            caveats=CAVEATS,
        )

        await set_cached(cache_key, result.model_dump(mode="json"), CACHE_TTL)
        return result
