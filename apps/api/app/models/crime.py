from pydantic import BaseModel


class CrimeIncident(BaseModel):
    category: str
    latitude: float
    longitude: float
    street: str
    month: str


class CrimeIncidentList(BaseModel):
    postcode: str
    period_months: int
    total: int
    incidents: list[CrimeIncident]
    source: str = "police.uk"


class CrimeCategorySummary(BaseModel):
    category: str
    count: int


class MonthlyCount(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class CrimeSummary(BaseModel):
    postcode: str
    period_months: int
    total_incidents: int
    top_categories: list[CrimeCategorySummary]
    monthly_trend: list[MonthlyCount]
    summary: str | None = None
    source: str = "police.uk"
    updated_frequency: str = "Monthly"
    caveats: list[str]
