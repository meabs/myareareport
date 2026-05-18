import logging
from collections import Counter
from datetime import date

from app.cache.redis_cache import get_cached, set_cached
from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
from app.providers.police_uk import PoliceUkProvider
from app.services.area_service import AreaService
from app.summaries import crime_summary as crime_summary_engine

logger = logging.getLogger(__name__)

CACHE_TTL = 86400  # 24 hours

CAVEATS = [
    "Crime data is published monthly and may lag behind current conditions.",
    "Reported incidents reflect reporting behaviour and policing patterns.",
    "This data should not be used as a real-time safety indicator.",
]

TOP_CATEGORIES_LIMIT = 5


def _months_to_query(months: int) -> list[str]:
    """Return a list of YYYY-MM strings for the last `months` complete months.

    The most recent complete month is the month before today's month.
    Returns months in ascending order (oldest first).
    """
    today = date.today()
    # Most recent complete month: subtract one month from current year/month
    year = today.year
    month = today.month - 1
    if month == 0:
        month = 12
        year -= 1

    result: list[str] = []
    for _ in range(months):
        result.append(f"{year}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    return list(reversed(result))  # oldest first


class CrimeService:
    def __init__(
        self,
        provider: PoliceUkProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or PoliceUkProvider()
        self._area_service = area_service or AreaService()

    async def get_crime_summary(self, raw_postcode: str, months: int) -> CrimeSummary:
        # Resolve postcode → coordinates (raises PostcodeNotFoundError / ProviderUnavailableError)
        area = await self._area_service.get_area(raw_postcode)
        normalised = area.postcode

        cache_key = f"crime:{normalised}:{months}"

        cached = await get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for %s", cache_key)
            return CrimeSummary.model_validate(cached)

        date_strings = _months_to_query(months)

        category_counter: Counter[str] = Counter()
        month_counter: Counter[str] = Counter()

        for date_str in date_strings:
            incidents = await self._provider.get_street_crime(
                lat=area.latitude,
                lng=area.longitude,
                date=date_str,
            )
            for incident in incidents:
                category = str(incident.get("category", "unknown"))
                category_counter[category] += 1
                month_counter[date_str] += 1

        top_categories = [
            CrimeCategorySummary(category=cat, count=cnt)
            for cat, cnt in category_counter.most_common(TOP_CATEGORIES_LIMIT)
        ]

        monthly_trend = [
            MonthlyCount(month=m, count=month_counter.get(m, 0))
            for m in date_strings  # already ascending
        ]

        crime_data = CrimeSummary(
            postcode=normalised,
            period_months=months,
            total_incidents=sum(category_counter.values()),
            top_categories=top_categories,
            monthly_trend=monthly_trend,
            caveats=CAVEATS,
        )
        crime_data.summary = crime_summary_engine.generate(crime_data)
        summary = crime_data

        await set_cached(cache_key, summary.model_dump(), CACHE_TTL)

        return summary
