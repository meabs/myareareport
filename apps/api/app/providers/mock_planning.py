from app.models.planning import PlanningApplication


class MockPlanningProvider:
    async def get_applications(
        self, lat: float, lng: float, radius_km: float
    ) -> list[PlanningApplication]:
        return [
            PlanningApplication(
                reference="MOCK/001/FUL",
                status="Pending",
                description="Residential development of 12 dwellings",
                address="Example Road",
                distance_km=1.2,
                decision_date=None,
                source="mock",
            ),
            PlanningApplication(
                reference="MOCK/002/OUT",
                status="Approved",
                description="Outline planning: mixed use",
                address="High Street",
                distance_km=0.8,
                decision_date=None,
                source="mock",
            ),
        ]
