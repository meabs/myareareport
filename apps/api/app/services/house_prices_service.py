import logging

from app.cache.redis_cache import get_cached, set_cached
from app.models.house_prices import HousePricesSummary
from app.providers.land_registry import LandRegistryProvider
from app.services.area_service import AreaService, normalise_postcode

logger = logging.getLogger(__name__)

CACHE_TTL = 86400  # 24 hours — prices change infrequently

CAVEATS = [
    "Data from HM Land Registry Price Paid Data.",
    "Includes residential freehold and leasehold sales in England and Wales.",
    "New-build and right-to-buy sales are excluded from some analyses.",
    "Prices may be registered months after the actual sale date.",
]


def _format_price(p: int) -> str:
    return f"£{p:,}"


class HousePricesService:
    def __init__(
        self,
        provider: LandRegistryProvider | None = None,
        area_service: AreaService | None = None,
    ) -> None:
        self._provider = provider or LandRegistryProvider()
        self._area_service = area_service or AreaService()

    async def get_house_prices(self, raw_postcode: str) -> HousePricesSummary:
        """Return a HousePricesSummary for the given postcode.

        Raises PostcodeNotFoundError / ProviderUnavailableError from AreaService,
        or LandRegistryProviderTimeoutError / LandRegistryProviderError from the provider.
        """
        normalised = normalise_postcode(raw_postcode)

        cache_key = f"house_prices:{normalised}"
        cached = await get_cached(cache_key)
        if cached is not None:
            logger.debug("Cache hit for %s", cache_key)
            return HousePricesSummary.model_validate(cached)

        transactions = await self._provider.get_transactions(normalised)

        average_price: int | None = None
        if transactions:
            average_price = sum(t.price for t in transactions) // len(transactions)

        if not transactions:
            summary = "No recent sold prices were found for this postcode."
        elif len(transactions) == 1:
            t = transactions[0]
            summary = (
                f"1 sale found: {_format_price(t.price)} for a {t.property_type.lower()} "
                f"({t.date.strftime('%b %Y')})."
            )
        else:
            most_recent = transactions[0]
            summary = (
                f"{len(transactions)} recent sales. Most recent: "
                f"{_format_price(most_recent.price)} for a {most_recent.property_type.lower()} "
                f"at {most_recent.address} ({most_recent.date.strftime('%b %Y')}). "
                f"Average: {_format_price(average_price)}."
            )

        result = HousePricesSummary(
            postcode=normalised,
            transactions=transactions,
            average_price=average_price,
            caveats=CAVEATS,
            summary=summary,
        )

        await set_cached(cache_key, result.model_dump(), CACHE_TTL)
        return result
