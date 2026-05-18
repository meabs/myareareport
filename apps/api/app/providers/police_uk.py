import httpx
import sentry_sdk


class PoliceUkProviderTimeoutError(Exception):
    """Raised when police.uk API times out."""


class PoliceUkProviderError(Exception):
    """Raised when an unexpected error occurs contacting police.uk."""


class PoliceUkProvider:
    BASE_URL = "https://data.police.uk/api"
    TIMEOUT = 10.0

    async def get_street_crime(self, lat: float, lng: float, date: str) -> list[dict[str, object]]:
        """Fetch all street crime for a lat/lng and YYYY-MM date string.

        Returns raw list of incident dicts from police.uk.
        Raises PoliceUkProviderTimeoutError on timeout.
        Raises PoliceUkProviderError on unexpected errors.
        """
        url = f"{self.BASE_URL}/crimes-street/all-crime"
        params: dict[str, str | float] = {"lat": lat, "lng": lng, "date": date}
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise PoliceUkProviderTimeoutError(
                f"Request to police.uk timed out for {date}"
            ) from exc
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise PoliceUkProviderError(
                f"Unexpected error contacting police.uk: {exc}"
            ) from exc

        if response.status_code in (404, 429):
            # 404: month not yet published; 429: rate limited — skip silently
            return []

        if not response.is_success:
            err = RuntimeError(
                f"Unexpected status {response.status_code} from police.uk"
            )
            sentry_sdk.capture_exception(err)
            raise PoliceUkProviderError(str(err)) from err

        result: list[dict[str, object]] = response.json()
        return result
