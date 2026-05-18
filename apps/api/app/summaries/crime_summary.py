"""Deterministic rule-based summary engine for crime data.

No LLM calls. No vague safety labels. No ranking language.
"""

from app.models.crime import CrimeSummary


def generate(summary: CrimeSummary) -> str:
    """Generate a plain-English summary from a CrimeSummary.

    Rules:
    - Zero incidents → fixed message.
    - Trend determined by comparing first-half vs second-half of monthly_trend.
    - Category sentence built from top two categories (if any).
    """
    if summary.total_incidents == 0:
        return "No reported incidents were returned for the selected period."

    trend = _determine_trend(summary)
    category_sentence = _build_category_sentence(summary)

    if trend == "increasing":
        lead = "Reported incidents increased over the selected period."
    elif trend == "decreasing":
        lead = "Reported incidents decreased over the selected period."
    else:
        lead = "Reported crime levels were broadly stable over the selected period."

    if category_sentence:
        return f"{lead} {category_sentence}"
    return lead


def _determine_trend(summary: CrimeSummary) -> str:
    """Return 'increasing', 'decreasing', or 'stable'."""
    trend = summary.monthly_trend
    if len(trend) < 2:
        return "stable"

    mid = len(trend) // 2
    first_half = trend[:mid]
    second_half = trend[mid:]

    first_avg = sum(m.count for m in first_half) / len(first_half)
    second_avg = sum(m.count for m in second_half) / len(second_half)

    if first_avg == 0:
        # Avoid division by zero; treat any positive second half as increasing
        if second_avg > 0:
            return "increasing"
        return "stable"

    change_ratio = (second_avg - first_avg) / first_avg

    if change_ratio > 0.10:
        return "increasing"
    if change_ratio < -0.10:
        return "decreasing"
    return "stable"


def _build_category_sentence(summary: CrimeSummary) -> str:
    """Build a category sentence from the top (up to 2) categories."""
    cats = summary.top_categories
    if not cats:
        return ""
    if len(cats) == 1:
        return f"The most common reported category was {cats[0].category}."
    return f"The most common reported categories were {cats[0].category} and {cats[1].category}."
