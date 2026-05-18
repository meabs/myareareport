from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel

from app.models.area import Area
from app.models.crime import CrimeSummary


class SectionStatus(StrEnum):
    available = "available"
    unavailable = "unavailable"
    not_implemented = "not_implemented"
    error = "error"
    empty = "empty"


class SourceRef(BaseModel):
    name: str
    url: str


class CrimeSection(BaseModel):
    status: SectionStatus
    summary: str | None
    data: CrimeSummary | None


class PlaceholderSection(BaseModel):
    status: SectionStatus
    summary: str | None
    data: None = None


class AreaSection(BaseModel):
    status: SectionStatus
    data: Area | None


class ReportSections(BaseModel):
    crime: CrimeSection
    flood: PlaceholderSection
    planning: PlaceholderSection


class Report(BaseModel):
    postcode: str
    generated_at: datetime  # must be timezone-aware UTC
    area: AreaSection
    sections: ReportSections
    sources: list[SourceRef]
