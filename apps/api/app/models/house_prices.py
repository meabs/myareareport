from datetime import date

from pydantic import BaseModel


class HousePrice(BaseModel):
    address: str
    price: int
    date: date
    property_type: str


class HousePricesSummary(BaseModel):
    postcode: str
    transactions: list[HousePrice]
    average_price: int | None
    source: str = "HM Land Registry"
    caveats: list[str]
    summary: str
