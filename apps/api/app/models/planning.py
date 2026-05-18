from datetime import date

from pydantic import BaseModel


class PlanningApplication(BaseModel):
    reference: str
    status: str
    description: str
    address: str
    distance_km: float | None
    decision_date: date | None
    source: str


class PlanningSummary(BaseModel):
    postcode: str
    radius_km: float
    application_count: int
    applications: list[PlanningApplication]
    summary: str
    caveats: list[str]
