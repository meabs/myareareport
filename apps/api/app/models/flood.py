from datetime import datetime

from pydantic import BaseModel


class FloodWarning(BaseModel):
    severity: str
    message: str
    area: str
    source: str = "Environment Agency"


class FloodStation(BaseModel):
    label: str
    distance_km: float | None
    latest_level_m: float | None
    timestamp: datetime | None


class RainfallGauge(BaseModel):
    label: str
    distance_km: float | None
    latest_mm: float | None
    timestamp: datetime | None


class FloodRiskSummary(BaseModel):
    postcode: str
    current_warnings: list[FloodWarning]
    nearest_stations: list[FloodStation]
    rainfall_gauges: list[RainfallGauge] = []
    summary: str
    source: str = "Environment Agency"
    caveats: list[str]
