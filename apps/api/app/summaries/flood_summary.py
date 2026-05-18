"""Flood risk summary generation."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.flood import FloodRiskSummary


def generate_placeholder() -> str:
    return "Flood risk data is not yet available for this area."


def generate(summary: FloodRiskSummary) -> str:
    """Generate a human-readable summary string for a FloodRiskSummary.

    Rules:
    - 0 warnings: "No current flood warnings were found near this postcode."
    - 1 warning: "There is 1 active flood {severity} near this postcode."
    - 2+ warnings: "There are {n} active flood alerts or warnings near this postcode."
    """
    n = len(summary.current_warnings)
    if n == 0:
        return "No current flood warnings were found near this postcode."
    if n == 1:
        severity = summary.current_warnings[0].severity
        return f"There is 1 active flood {severity} near this postcode."
    return f"There are {n} active flood alerts or warnings near this postcode."
