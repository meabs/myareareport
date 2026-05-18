from typing import Protocol

from app.models.planning import PlanningApplication


class PlanningProvider(Protocol):
    async def get_applications(
        self, lat: float, lng: float, radius_km: float
    ) -> list[PlanningApplication]: ...
