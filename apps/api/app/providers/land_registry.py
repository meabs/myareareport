from datetime import date
from urllib.parse import quote

import httpx
import sentry_sdk

from app.models.house_prices import HousePrice


class LandRegistryProviderTimeoutError(Exception):
    """Raised when the Land Registry API times out."""


class LandRegistryProviderError(Exception):
    """Raised when an unexpected error occurs contacting the Land Registry API."""


def _spaced_postcode(postcode: str) -> str:
    """Land Registry stores postcodes with a space: 'DL148HJ' → 'DL14 8HJ'."""
    clean = postcode.replace(" ", "").upper()
    if len(clean) >= 4:
        return f"{clean[:-3]} {clean[-3:]}"
    return clean


PROP_TYPE_MAP = {
    "Detached": "Detached",
    "Semi-Detached": "Semi-Detached",
    "Terraced": "Terraced",
    "Flat / Maisonette": "Flat",
    "Other": "Other",
}


class LandRegistryProvider:
    SPARQL_URL = "https://landregistry.data.gov.uk/landregistry/query"
    TIMEOUT = 12.0

    async def get_transactions(self, postcode: str) -> list[HousePrice]:
        """Fetch recent sold house prices for a postcode via Land Registry SPARQL.

        Returns up to 10 most recent transactions.
        Raises LandRegistryProviderTimeoutError on timeout.
        Raises LandRegistryProviderError on unexpected errors.
        """
        lr_postcode = _spaced_postcode(postcode)
        xsd_string = "http://www.w3.org/2001/XMLSchema#string"
        sparql = f"""
PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?price ?date ?paon ?saon ?street ?town ?propertyType
WHERE {{
  VALUES ?pc {{ "{lr_postcode}"^^<{xsd_string}> }}
  ?transx lrppi:pricePaid ?price ;
          lrppi:transactionDate ?date ;
          lrppi:propertyAddress ?addr .
  ?addr lrcommon:postcode ?pc ;
        lrcommon:paon ?paon ;
        lrcommon:street ?street ;
        lrcommon:town ?town .
  OPTIONAL {{ ?addr lrcommon:saon ?saon }}
  OPTIONAL {{ ?transx lrppi:propertyType/rdfs:label ?propertyType }}
}}
ORDER BY DESC(?date)
LIMIT 10
"""
        # Build URL manually to force %20 encoding for spaces — LR rejects + encoding
        encoded_query = quote(sparql.strip(), safe="")
        url = f"{self.SPARQL_URL}?output=json&query={encoded_query}"
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(url)
        except httpx.TimeoutException as exc:
            raise LandRegistryProviderTimeoutError(
                "Request to Land Registry SPARQL API timed out"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise LandRegistryProviderError(
                f"Unexpected error contacting Land Registry API: {exc}"
            ) from exc

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from Land Registry API"
            )
            sentry_sdk.capture_exception(err)
            raise LandRegistryProviderError(str(err)) from err

        bindings: list[dict] = (
            response.json().get("results", {}).get("bindings", [])
        )
        transactions: list[HousePrice] = []
        for b in bindings:
            try:
                price_raw = b.get("price", {}).get("value", "")
                date_raw = b.get("date", {}).get("value", "")
                if not price_raw or not date_raw:
                    continue
                price = int(float(price_raw))
                trans_date = date.fromisoformat(date_raw[:10])
            except (ValueError, TypeError):
                continue

            paon = b.get("paon", {}).get("value", "")
            saon = b.get("saon", {}).get("value", "")
            street = b.get("street", {}).get("value", "")
            prop_type_raw = b.get("propertyType", {}).get("value", "Unknown")
            prop_type = PROP_TYPE_MAP.get(prop_type_raw, prop_type_raw)

            parts = [p for p in [saon, paon, street.title()] if p]
            address = ", ".join(parts) if parts else "Unknown address"

            transactions.append(
                HousePrice(
                    address=address,
                    price=price,
                    date=trans_date,
                    property_type=prop_type,
                )
            )
        return transactions
