from app.models.area import Area
from app.providers.postcodes_io import PostcodesIoProvider


def normalise_postcode(raw: str) -> str:
    """Strip whitespace and uppercase the postcode for lookup."""
    return raw.strip().upper().replace(" ", "")


class AreaService:
    def __init__(self, provider: PostcodesIoProvider | None = None) -> None:
        self._provider = provider or PostcodesIoProvider()

    async def get_area(self, raw_postcode: str) -> Area:
        postcode = normalise_postcode(raw_postcode)
        return await self._provider.lookup(postcode)
