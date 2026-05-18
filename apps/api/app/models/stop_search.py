from pydantic import BaseModel


class StopSearchRecord(BaseModel):
    type: str
    date: str
    latitude: float | None
    longitude: float | None
    gender: str | None
    age_range: str | None
    self_defined_ethnicity: str | None
    object_of_search: str | None
    outcome: str | None


class StopSearchSummary(BaseModel):
    postcode: str
    period_months: int
    total: int
    records: list[StopSearchRecord]
    source: str = "police.uk"
    caveats: list[str]
