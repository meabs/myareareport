"""Tool: explain_dataset — curated descriptions of public data sources."""

DATASET_COPY: dict[str, dict] = {
    "crime": {
        "title": "Reported crime (police.uk)",
        "description": (
            "Counts of crimes reported to police in the area around a postcode, "
            "aggregated by month and category. Published with a monthly lag."
        ),
        "limitations": [
            "Reflects reported crime only, not all incidents.",
            "Location is approximate to the crime reporting area.",
            "Do not use as a real-time safety indicator or area ranking.",
        ],
        "source_url": "https://data.police.uk",
    },
    "flood": {
        "title": "Flood monitoring (Environment Agency)",
        "description": (
            "Active flood warnings and nearby river/tidal monitoring station levels "
            "for the postcode area."
        ),
        "limitations": [
            "Warnings can change quickly; always check official EA channels for emergencies.",
            "Station distance is approximate.",
        ],
        "source_url": "https://environment.data.gov.uk",
    },
    "planning": {
        "title": "Planning applications (planning.data.gov.uk)",
        "description": (
            "Planning applications near the postcode within a search radius, "
            "including status and description where available."
        ),
        "limitations": [
            "Coverage varies by local authority.",
            "May not include very recent applications.",
        ],
        "source_url": "https://www.planning.data.gov.uk",
    },
    "stop_search": {
        "title": "Stop and search (police.uk)",
        "description": (
            "Records of stop and search encounters near the postcode area "
            "over recent months."
        ),
        "limitations": [
            "A stop or search is not an indication of guilt.",
            "Do not use to profile individuals or communities.",
            "Published monthly with lag.",
        ],
        "source_url": "https://data.police.uk",
    },
}


def explain_dataset(topic: str) -> dict:
    """Return static educational copy for a dataset topic."""
    key = topic.strip().lower().replace("-", "_").replace(" ", "_")
    if key not in DATASET_COPY:
        return {
            "error": "Unknown topic",
            "valid_topics": list(DATASET_COPY.keys()),
        }
    return {"topic": key, **DATASET_COPY[key]}
