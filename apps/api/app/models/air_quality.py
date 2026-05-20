from datetime import datetime

from pydantic import BaseModel


class AirQualityReading(BaseModel):
    parameter: str
    value: float
    unit: str
    last_updated: datetime | None


class AirQualityStation(BaseModel):
    name: str
    distance_km: float | None
    readings: list[AirQualityReading]


class AirQualitySummary(BaseModel):
    postcode: str
    nearest_station: AirQualityStation | None
    aqi_label: str
    aqi_index: int | None
    summary: str
    source: str = "OpenAQ"
    caveats: list[str]
