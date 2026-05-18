import logging
from datetime import UTC, datetime

from app.models.report import (
    AreaSection,
    CrimeSection,
    FloodSection,
    PlanningSection,
    Report,
    ReportSections,
    SectionStatus,
    SourceRef,
)
from app.services.area_service import AreaService, normalise_postcode
from app.services.crime_service import CrimeService
from app.services.flood_service import FloodService
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
}


class ReportService:
    def __init__(
        self,
        area_service: AreaService | None = None,
        crime_service: CrimeService | None = None,
        flood_service: FloodService | None = None,
        planning_service: PlanningService | None = None,
    ) -> None:
        self._area_service = area_service or AreaService()
        self._crime_service = crime_service or CrimeService()
        self._flood_service = flood_service or FloodService()
        self._planning_service = planning_service or PlanningService()

    async def get_report(self, postcode: str) -> Report:
        normalised = normalise_postcode(postcode)

        # Raises PostcodeNotFoundError / ProviderUnavailableError on failure — callers propagate
        area = await self._area_service.get_area(normalised)

        area_section = AreaSection(
            status=SectionStatus.available,
            data=area,
        )

        # Crime — absorb any failure, do not crash the report
        try:
            crime_data = await self._crime_service.get_crime_summary(normalised, CRIME_MONTHS)
            crime_section = CrimeSection(
                status=SectionStatus.available,
                summary=crime_data.summary,
                data=crime_data,
            )
        except Exception:
            logger.warning("Crime service failed for %s; marking section unavailable", normalised)
            crime_section = CrimeSection(
                status=SectionStatus.unavailable,
                summary=None,
                data=None,
            )

        # Flood — absorb any failure, do not crash the report
        try:
            flood_data = await self._flood_service.get_flood_summary(normalised)
            flood_section = FloodSection(
                status=SectionStatus.available,
                summary=flood_data.summary,
                data=flood_data,
            )
        except Exception:
            logger.warning("Flood service failed for %s; marking section unavailable", normalised)
            flood_section = FloodSection(
                status=SectionStatus.unavailable,
                summary=None,
                data=None,
            )

        # Planning — absorb any failure, do not crash the report
        try:
            planning_data = await self._planning_service.get_planning_summary(normalised)
            planning_section = PlanningSection(
                status=SectionStatus.available,
                summary=planning_data.summary,
                data=planning_data,
            )
        except Exception:
            logger.warning(
                "Planning service failed for %s; marking section unavailable", normalised
            )
            planning_section = PlanningSection(
                status=SectionStatus.unavailable,
                summary=None,
                data=None,
            )

        sources: list[SourceRef] = [SOURCES["postcodes.io"]]
        if crime_section.status == SectionStatus.available:
            sources.append(SOURCES["police.uk"])
        if flood_section.status == SectionStatus.available:
            sources.append(SOURCES["environment_agency"])
        if planning_section.status == SectionStatus.available:
            sources.append(SOURCES["planning.data.gov.uk"])

        return Report(
            postcode=area.postcode,
            generated_at=datetime.now(UTC),
            area=area_section,
            sections=ReportSections(
                crime=crime_section,
                flood=flood_section,
                planning=planning_section,
            ),
            sources=sources,
        )
