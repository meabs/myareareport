import logging

from app.cache.redis_cache import get_cached, set_cached
from app.models.planning import PlanningSummary
from app.providers.mock_planning import MockPlanningProvider
from app.providers.planning_data_gov_uk import PlanningDataGovUkProvider
from app.services.area_service import AreaService, normalise_postcode
from app.summaries import planning_summary as planning_summary_engine

logger = logging.getLogger(__name__)

CACHE_TTL = 43200  # 12 hours

CAVEATS = [
    "Planning data coverage varies by local authority.",
    "Some applications may be missing or delayed depending on council publication practices.",
]


class PlanningService:
    def __init__(
        self,
        provider: PlanningDataGovUkProvider | None = None,
        mock_provider: MockPlanningProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or PlanningDataGovUkProvider()
        self._mock_provider = mock_provider or MockPlanningProvider()
        self._area_service = area_service or AreaService()

    async def get_planning_summary(
        self, postcode: str, radius_km: float = 2.0
    ) -> PlanningSummary:
        """Return a PlanningSummary for the given postcode and radius.

        Resolves postcode → lat/lng, checks Redis cache, calls the
        planning.data.gov.uk provider (falling back to mock on failure or
        empty results), and caches the result.

        Raises PostcodeNotFoundError / ProviderUnavailableError from AreaService.
        """
        normalised = normalise_postcode(postcode)

        # Resolve postcode → coordinates
        area = await self._area_service.get_area(normalised)

        cache_key = f"planning:{normalised}:{radius_km}"

        cached = await get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for %s", cache_key)
            return PlanningSummary.model_validate(cached)

        # Try live provider; fall back to mock on any failure or empty result
        applications = []
        try:
            applications = await self._provider.get_applications(
                area.latitude, area.longitude, radius_km
            )
        except Exception:
            logger.warning(
                "PlanningDataGovUkProvider failed for %s; falling back to mock",
                normalised,
            )

        if not applications:
            logger.debug(
                "Live provider returned no results for %s; using mock provider",
                normalised,
            )
            applications = await self._mock_provider.get_applications(
                area.latitude, area.longitude, radius_km
            )

        summary_obj = PlanningSummary(
            postcode=normalised,
            radius_km=radius_km,
            application_count=len(applications),
            applications=applications,
            summary="",  # filled in below
            caveats=CAVEATS,
        )
        summary_obj.summary = planning_summary_engine.generate(summary_obj)

        await set_cached(cache_key, summary_obj.model_dump(), CACHE_TTL)

        return summary_obj
