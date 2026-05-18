"""Planning application summary generator."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.planning import PlanningSummary


def generate_placeholder() -> str:
    return "Planning application data is not yet available for this area."


def generate(summary: PlanningSummary) -> str:
    n = summary.application_count
    r = summary.radius_km
    if n == 0:
        return f"No nearby planning applications were found within {r} km."
    if n == 1:
        return f"One nearby planning application was found within {r} km."
    return f"{n} nearby planning applications were found within {r} km."
