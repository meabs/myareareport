import asyncio
import logging
from datetime import UTC, datetime

from app.models.report import (
    AirQualitySection,
    AreaSection,
    CrimeSection,
    FloodSection,
    HousePricesSection,
    PlanningSection,
    Report,
    ReportSections,
    SectionStatus,
    SourceRef,
)
from app.services.air_quality_service import AirQualityService
from app.services.area_service import AreaService, normalise_postcode
from app.services.crime_service import CrimeService
from app.services.flood_service import FloodService
from app.services.house_prices_service import HousePricesService
from app.services.planning_service import PlanningService

logger = logging.getLogger(__name__)

CRIME_MONTHS = 12

SOURCES: dict[str, SourceRef] = {
    "postcodes.io": SourceRef(name="postcodes.io", url="https://postcodes.io/"),
    "police.uk": SourceRef(name="police.uk", url="https://data.police.uk/"),
    "environment_agency": SourceRef(
        name="Environment Agency",
        url="https://environment.data.gov.uk/flood-monitoring/",
    ),
    "planning.data.gov.uk": SourceRef(
        name="planning.data.gov.uk",
        url="https://www.planning.data.gov.uk/",
    ),
    "land_registry": SourceRef(
        name="HM Land Registry",
        url="https://www.gov.uk/government/collections/price-paid-data",
    ),
    "open_aq": SourceRef(
        name="OpenAQ",
        url="https://openaq.org/",
    ),
}


class ReportService:
    def __init__(
        self,
        area_service: AreaService | None = None,
        crime_service: CrimeService | None = None,
        flood_service: FloodService | None = None,
        planning_service: PlanningService | None = None,
        house_prices_service: HousePricesService | None = None,
        air_quality_service: AirQualityService | None = None,
    ) -> None:
        self._area_service = area_service or AreaService()
        self._crime_service = crime_service or CrimeService()
        self._flood_service = flood_service or FloodService()
        self._planning_service = planning_service or PlanningService()
        self._house_prices_service = house_prices_service or HousePricesService()
        self._air_quality_service = air_quality_service or AirQualityService()

    async def get_report(self, postcode: str) -> Report:
        normalised = normalise_postcode(postcode)

        # Raises PostcodeNotFoundError / ProviderUnavailableError on failure — callers propagate
        area = await self._area_service.get_area(normalised)

        area_section = AreaSection(
            status=SectionStatus.available,
            data=area,
        )

        # Fetch all sections concurrently; failures are returned as exceptions.
        results = await asyncio.gather(
            self._crime_service.get_crime_summary(normalised, CRIME_MONTHS),
            self._flood_service.get_flood_summary(normalised),
            self._planning_service.get_planning_summary(normalised),
            self._house_prices_service.get_house_prices(normalised),
            self._air_quality_service.get_air_quality(normalised),
            return_exceptions=True,
        )
        crime_result, flood_result, planning_result, prices_result, aq_result = results

        if isinstance(crime_result, Exception):
            logger.warning("Crime service failed for %s; marking section unavailable", normalised)
            crime_section = CrimeSection(status=SectionStatus.unavailable, summary=None, data=None)
        else:
            crime_section = CrimeSection(
                status=SectionStatus.available,
                summary=crime_result.summary,
                data=crime_result,
            )

        if isinstance(flood_result, Exception):
            logger.warning("Flood service failed for %s; marking section unavailable", normalised)
            flood_section = FloodSection(status=SectionStatus.unavailable, summary=None, data=None)
        else:
            flood_section = FloodSection(
                status=SectionStatus.available,
                summary=flood_result.summary,
                data=flood_result,
            )

        if isinstance(planning_result, Exception):
            logger.warning(
                "Planning service failed for %s; marking section unavailable", normalised
            )
            planning_section = PlanningSection(
                status=SectionStatus.unavailable, summary=None, data=None
            )
        else:
            planning_section = PlanningSection(
                status=SectionStatus.available,
                summary=planning_result.summary,
                data=planning_result,
            )

        if isinstance(prices_result, Exception):
            logger.warning(
                "House prices service failed for %s; marking section unavailable", normalised
            )
            house_prices_section = HousePricesSection(
                status=SectionStatus.unavailable, summary=None, data=None
            )
        else:
            house_prices_section = HousePricesSection(
                status=SectionStatus.available,
                summary=prices_result.summary,
                data=prices_result,
            )

        if isinstance(aq_result, Exception):
            logger.warning(
                "Air quality service failed for %s; marking section unavailable", normalised
            )
            air_quality_section = AirQualitySection(
                status=SectionStatus.unavailable, summary=None, data=None
            )
        else:
            air_quality_section = AirQualitySection(
                status=SectionStatus.available,
                summary=aq_result.summary,
                data=aq_result,
            )

        sources: list[SourceRef] = [SOURCES["postcodes.io"]]
        if crime_section.status == SectionStatus.available:
            sources.append(SOURCES["police.uk"])
        if flood_section.status == SectionStatus.available:
            sources.append(SOURCES["environment_agency"])
        if planning_section.status == SectionStatus.available:
            sources.append(SOURCES["planning.data.gov.uk"])
        if house_prices_section.status == SectionStatus.available:
            sources.append(SOURCES["land_registry"])
        if air_quality_section.status == SectionStatus.available:
            sources.append(SOURCES["open_aq"])

        return Report(
            postcode=area.postcode,
            generated_at=datetime.now(UTC),
            area=area_section,
            sections=ReportSections(
                crime=crime_section,
                flood=flood_section,
                planning=planning_section,
                house_prices=house_prices_section,
                air_quality=air_quality_section,
            ),
            sources=sources,
        )
