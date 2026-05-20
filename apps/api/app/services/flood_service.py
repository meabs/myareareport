import asyncio
import logging

from app.cache.redis_cache import get_cached, set_cached
from app.models.flood import FloodRiskSummary
from app.providers.environment_agency import EnvironmentAgencyProvider
from app.services.area_service import AreaService, normalise_postcode
from app.summaries import flood_summary as flood_summary_engine

logger = logging.getLogger(__name__)

CACHE_TTL = 900  # 15 minutes

CAVEATS = [
    "Flood data can change quickly.",
    "Use official flood warning services for current emergency information.",
    "This service is not insurance or emergency advice.",
]


class FloodService:
    def __init__(
        self,
        provider: EnvironmentAgencyProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or EnvironmentAgencyProvider()
        self._area_service = area_service or AreaService()

    async def get_flood_summary(self, raw_postcode: str) -> FloodRiskSummary:
        """Return a FloodRiskSummary for the given postcode.

        Resolves postcode → lat/lng, checks Redis cache, calls the
        Environment Agency provider, and caches the result.

        Raises PostcodeNotFoundError / ProviderUnavailableError from AreaService,
        or EnvironmentAgencyProviderTimeoutError / EnvironmentAgencyProviderError
        from the provider.
        """
        normalised = normalise_postcode(raw_postcode)

        # Resolve postcode → coordinates
        area = await self._area_service.get_area(normalised)

        cache_key = f"flood:{normalised}"

        cached = await get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for %s", cache_key)
            return FloodRiskSummary.model_validate(cached)

        warnings, stations, rainfall_gauges = await asyncio.gather(
            self._provider.get_flood_warnings(area.latitude, area.longitude),
            self._provider.get_flood_stations(area.latitude, area.longitude),
            self._provider.get_rainfall_gauges(area.latitude, area.longitude),
        )

        summary_obj = FloodRiskSummary(
            postcode=normalised,
            current_warnings=warnings,
            nearest_stations=stations,
            rainfall_gauges=rainfall_gauges,
            summary="",  # filled in below
            caveats=CAVEATS,
        )
        summary_obj.summary = flood_summary_engine.generate(summary_obj)

        await set_cached(cache_key, summary_obj.model_dump(mode="json"), CACHE_TTL)

        return summary_obj
