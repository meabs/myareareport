import logging

import httpx
import sentry_sdk

from app.models.planning import PlanningApplication

logger = logging.getLogger(__name__)

TIMEOUT = 10.0
BASE_URL = "https://www.planning.data.gov.uk/api/entity.json"


class PlanningProviderTimeoutError(Exception):
    """Raised when the planning.data.gov.uk API times out."""


class PlanningProviderError(Exception):
    """Raised when the planning.data.gov.uk API returns an unexpected error."""


class PlanningDataGovUkProvider:
    async def get_applications(
        self, lat: float, lng: float, radius_km: float
    ) -> list[PlanningApplication]:
        url = BASE_URL
        params = {
            "dataset": "development-policy",
            "point": f"POINT({lng} {lat})",
            "entries": "current",
            "limit": "25",
        }

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise PlanningProviderTimeoutError(
                "Request to planning.data.gov.uk timed out"
            ) from exc
        except httpx.ConnectError as exc:
            raise PlanningProviderError(
                "Could not connect to planning.data.gov.uk"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise PlanningProviderError(
                "Unexpected error contacting planning.data.gov.uk"
            ) from exc

        if response.status_code == 404:
            logger.debug("planning.data.gov.uk returned 404; treating as empty results")
            return []

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from planning.data.gov.uk"
            )
            sentry_sdk.capture_exception(err)
            raise PlanningProviderError(str(err)) from err

        payload: dict[str, object] = response.json()
        entities = payload.get("entities", [])
        if not isinstance(entities, list):
            return []

        applications: list[PlanningApplication] = []
        for entity in entities:
            if not isinstance(entity, dict):
                continue
            reference = str(entity.get("reference") or entity.get("entity", ""))
            status = str(entity.get("status", "Unknown"))
            description = str(entity.get("name") or entity.get("description") or "")
            address = str(entity.get("address-text") or "")
            applications.append(
                PlanningApplication(
                    reference=reference,
                    status=status,
                    description=description,
                    address=address,
                    distance_km=None,
                    decision_date=None,
                    source="planning.data.gov.uk",
                )
            )

        return applications
