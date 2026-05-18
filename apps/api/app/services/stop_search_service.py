import asyncio
import logging

from app.cache.redis_cache import get_cached, set_cached
from app.models.stop_search import StopSearchRecord, StopSearchSummary
from app.providers.police_uk import PoliceUkProvider
from app.services.area_service import AreaService
from app.services.crime_service import _months_to_query

logger = logging.getLogger(__name__)

CACHE_TTL = 86400

CAVEATS = [
    "Stop and search data is published monthly and may lag behind current conditions.",
    "Statistics reflect recorded stops and should not be used to draw conclusions"
    " about individuals or communities.",
]


class StopSearchService:
    def __init__(
        self,
        provider: PoliceUkProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or PoliceUkProvider()
        self._area_service = area_service or AreaService()

    async def get_stop_search_summary(
        self, raw_postcode: str, months: int = 3
    ) -> StopSearchSummary:
        area = await self._area_service.get_area(raw_postcode)
        normalised = area.postcode
        cache_key = f"stop_search:{normalised}:{months}"

        cached = await get_cached(cache_key)
        if cached is not None:
            return StopSearchSummary.model_validate(cached)

        date_strings = _months_to_query(months)
        records: list[StopSearchRecord] = []

        for i, date_str in enumerate(date_strings):
            if i > 0:
                await asyncio.sleep(0.3)
            raw = await self._provider.get_stop_search(area.latitude, area.longitude, date_str)
            for item in raw:
                raw_loc = item.get("location")
                loc: dict[str, object] = raw_loc if isinstance(raw_loc, dict) else {}
                try:
                    lat: float | None = float(str(loc.get("latitude", 0))) or None
                    lng: float | None = float(str(loc.get("longitude", 0))) or None
                except (ValueError, TypeError):
                    lat = lng = None

                def _str_or_none(val: object) -> str | None:
                    s = str(val) if val is not None else ""
                    return s if s else None

                records.append(StopSearchRecord(
                    type=str(item.get("type", "Unknown")),
                    date=str(item.get("datetime", date_str)),
                    latitude=lat,
                    longitude=lng,
                    gender=_str_or_none(item.get("gender")),
                    age_range=_str_or_none(item.get("age_range")),
                    self_defined_ethnicity=_str_or_none(item.get("self_defined_ethnicity")),
                    object_of_search=_str_or_none(item.get("object_of_search")),
                    outcome=_str_or_none(item.get("outcome")),
                ))

        summary = StopSearchSummary(
            postcode=normalised,
            period_months=months,
            total=len(records),
            records=records,
            caveats=CAVEATS,
        )
        await set_cached(cache_key, summary.model_dump(), CACHE_TTL)
        return summary
