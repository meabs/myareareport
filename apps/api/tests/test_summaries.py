"""Tests for the deterministic rule-based summary engine (Stage 3)."""

from app.models.crime import CrimeCategorySummary, CrimeSummary, MonthlyCount
from app.summaries import crime_summary as crime_summary_engine
from app.summaries.flood_summary import generate_placeholder as flood_placeholder
from app.summaries.planning_summary import generate_placeholder as planning_placeholder

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FORBIDDEN_WORDS = [
    "safe",
    "unsafe",
    "dangerous",
    "low-crime",
    "high-crime",
    "best area",
    "worst area",
    "avoid",
    "recommended place to live",
]


def _make_summary(
    total: int,
    monthly_counts: list[int],
    categories: list[tuple[str, int]] | None = None,
) -> CrimeSummary:
    """Build a minimal CrimeSummary for testing."""
    months = [f"2025-{i+1:02d}" for i in range(len(monthly_counts))]
    monthly_trend = [
        MonthlyCount(month=m, count=c) for m, c in zip(months, monthly_counts, strict=True)
    ]
    top_categories = (
        [CrimeCategorySummary(category=cat, count=cnt) for cat, cnt in categories]
        if categories
        else []
    )
    return CrimeSummary(
        postcode="SW1A 1AA",
        period_months=len(monthly_counts),
        total_incidents=total,
        top_categories=top_categories,
        monthly_trend=monthly_trend,
        caveats=[],
    )


# ---------------------------------------------------------------------------
# Test 1: Zero incidents → exact fixed message
# ---------------------------------------------------------------------------


def test_zero_incidents_returns_fixed_message() -> None:
    summary = _make_summary(total=0, monthly_counts=[0, 0])
    result = crime_summary_engine.generate(summary)
    assert result == "No reported incidents were returned for the selected period."


# ---------------------------------------------------------------------------
# Test 2: Stable trend → "broadly stable"
# ---------------------------------------------------------------------------


def test_stable_trend_contains_broadly_stable() -> None:
    # First half avg = 10, second half avg = 10 → no change → stable
    summary = _make_summary(total=40, monthly_counts=[10, 10, 10, 10])
    result = crime_summary_engine.generate(summary)
    assert "broadly stable" in result


# ---------------------------------------------------------------------------
# Test 3: Increasing trend → "increased"
# ---------------------------------------------------------------------------


def test_increasing_trend_contains_increased() -> None:
    # First half avg = 5, second half avg = 20 → +300% → increasing
    summary = _make_summary(total=50, monthly_counts=[5, 5, 20, 20])
    result = crime_summary_engine.generate(summary)
    assert "increased" in result


# ---------------------------------------------------------------------------
# Test 4: Decreasing trend → "decreased"
# ---------------------------------------------------------------------------


def test_decreasing_trend_contains_decreased() -> None:
    # First half avg = 20, second half avg = 5 → -75% → decreasing
    summary = _make_summary(total=50, monthly_counts=[20, 20, 5, 5])
    result = crime_summary_engine.generate(summary)
    assert "decreased" in result


# ---------------------------------------------------------------------------
# Test 5: One category → singular phrasing
# ---------------------------------------------------------------------------


def test_one_category_uses_singular_phrasing() -> None:
    summary = _make_summary(
        total=10,
        monthly_counts=[5, 5],
        categories=[("burglary", 10)],
    )
    result = crime_summary_engine.generate(summary)
    assert "The most common reported category was burglary." in result


# ---------------------------------------------------------------------------
# Test 6: Two or more categories → plural phrasing with top two
# ---------------------------------------------------------------------------


def test_two_categories_uses_plural_phrasing() -> None:
    summary = _make_summary(
        total=30,
        monthly_counts=[15, 15],
        categories=[("burglary", 20), ("vehicle-crime", 8), ("other-theft", 2)],
    )
    result = crime_summary_engine.generate(summary)
    assert "The most common reported categories were burglary and vehicle-crime." in result


# ---------------------------------------------------------------------------
# Test 7: No categories → no category sentence in output
# ---------------------------------------------------------------------------


def test_no_categories_omits_category_sentence() -> None:
    summary = _make_summary(total=10, monthly_counts=[5, 5], categories=[])
    result = crime_summary_engine.generate(summary)
    assert "category" not in result.lower()
    assert "categories" not in result.lower()


# ---------------------------------------------------------------------------
# Test 8: Forbidden words never appear across all branches
# ---------------------------------------------------------------------------


def test_forbidden_words_absent_across_all_branches() -> None:
    summaries_to_check = [
        # zero incidents
        crime_summary_engine.generate(_make_summary(total=0, monthly_counts=[0, 0])),
        # stable, no categories
        crime_summary_engine.generate(_make_summary(total=20, monthly_counts=[10, 10])),
        # stable, one category
        crime_summary_engine.generate(
            _make_summary(total=20, monthly_counts=[10, 10], categories=[("burglary", 20)])
        ),
        # stable, two categories
        crime_summary_engine.generate(
            _make_summary(
                total=20,
                monthly_counts=[10, 10],
                categories=[("burglary", 15), ("vehicle-crime", 5)],
            )
        ),
        # increasing
        crime_summary_engine.generate(_make_summary(total=50, monthly_counts=[5, 5, 20, 20])),
        # decreasing
        crime_summary_engine.generate(_make_summary(total=50, monthly_counts=[20, 20, 5, 5])),
        # flood placeholder
        flood_placeholder(),
        # planning placeholder
        planning_placeholder(),
    ]

    for text in summaries_to_check:
        lower = text.lower()
        for word in FORBIDDEN_WORDS:
            assert word not in lower, (
                f"Forbidden word '{word}' found in summary: {text!r}"
            )


# ---------------------------------------------------------------------------
# Edge cases: fewer than 2 months → stable
# ---------------------------------------------------------------------------


def test_single_month_trend_is_stable() -> None:
    summary = _make_summary(total=5, monthly_counts=[5])
    result = crime_summary_engine.generate(summary)
    assert "broadly stable" in result


# ---------------------------------------------------------------------------
# Edge case: first-half average is zero, second-half positive → increasing
# ---------------------------------------------------------------------------


def test_zero_first_half_positive_second_half_is_increasing() -> None:
    summary = _make_summary(total=10, monthly_counts=[0, 0, 5, 5])
    result = crime_summary_engine.generate(summary)
    assert "increased" in result
