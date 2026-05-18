from pydantic import BaseModel


class Area(BaseModel):
    postcode: str
    latitude: float
    longitude: float
    admin_district: str | None
    admin_county: str | None
    region: str | None
    country: str
    source: str = "postcodes.io"
