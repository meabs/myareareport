import logging
from datetime import UTC, datetime

from app.models.report import (
    AreaSection,
    CrimeSection,
    PlaceholderSection,
    Report,
    ReportSections,
    SectionStatus,
    SourceRef,
)
from app.services.area_service import AreaService, normalise_postcode
from app.services.crime_service import CrimeService
from app.summaries import flood_summary, planning_summary

logger = logging.getLogger(__name__)

CRIME_MONTHS = 12

SOURCES: dict[str, SourceRef] = {
    "postcodes.io": SourceRef(name="postcodes.io", url="https://postcodes.io/"),
    "police.uk": SourceRef(name="police.uk", url="https://data.police.uk/"),
}


class ReportService:
    def __init__(
        self,
        area_service: AreaService | None = None,
        crime_service: CrimeService | None = None,
    ) -> None:
        self._area_service = area_service or AreaService()
        self._crime_service = crime_service or CrimeService()

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

        flood_section = PlaceholderSection(
            status=SectionStatus.not_implemented,
            summary=flood_summary.generate_placeholder(),
        )

        planning_section = PlaceholderSection(
            status=SectionStatus.not_implemented,
            summary=planning_summary.generate_placeholder(),
        )

        sources: list[SourceRef] = [SOURCES["postcodes.io"]]
        if crime_section.status == SectionStatus.available:
            sources.append(SOURCES["police.uk"])

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
