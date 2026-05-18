import httpx
import sentry_sdk

from app.models.area import Area


class PostcodeNotFoundError(Exception):
    """Raised when a postcode is not found or invalid."""


class ProviderUnavailableError(Exception):
    """Raised when the postcodes.io provider is unavailable or times out."""


def _str_or_none(value: object) -> str | None:
    if value is None:
        return None
    return str(value)


class PostcodesIoProvider:
    BASE_URL = "https://postcodes.io"
    TIMEOUT = 5.0

    async def lookup(self, postcode: str) -> Area:
        url = f"{self.BASE_URL}/postcodes/{postcode}"
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(url)
        except httpx.TimeoutException as exc:
            raise ProviderUnavailableError("Request to postcodes.io timed out") from exc
        except httpx.ConnectError as exc:
            raise ProviderUnavailableError("Could not connect to postcodes.io") from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise ProviderUnavailableError("Unexpected error contacting postcodes.io") from exc

        if response.status_code == 404:
            raise PostcodeNotFoundError(f"Postcode not found: {postcode}")

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from postcodes.io"
            )
            sentry_sdk.capture_exception(err)
            raise ProviderUnavailableError(str(err)) from err

        result: dict[str, object] = response.json()["result"]
        return Area(
            postcode=str(result["postcode"]),
            latitude=float(result["latitude"]),  # type: ignore[arg-type]
            longitude=float(result["longitude"]),  # type: ignore[arg-type]
            admin_district=_str_or_none(result.get("admin_district")),
            admin_county=_str_or_none(result.get("admin_county")),
            region=_str_or_none(result.get("region")),
            country=str(result["country"]),
        )
