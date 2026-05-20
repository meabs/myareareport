"""Enrich MCP tool responses for ChatGPT Apps SDK visibility (follow-ups, shareable text, widget URLs)."""

from __future__ import annotations

import base64
import json
import os
from urllib.parse import urlencode

CAVEAT_FOOTER = (
    "MyAreaReport uses public datasets that may be delayed or incomplete. "
    "Not for emergency, legal, insurance, or personal safety decisions."
)

WIDGET_BASE_URL = os.getenv("WIDGET_BASE_URL", "http://localhost:3000").rstrip("/")

# Keys added by enrich_response itself — strip before encoding data payload
_META_KEYS = frozenset({
    "suggested_followups", "shareable_summary", "widget_url",
    "display_mode", "_tool", "error",
})
# Max JSON bytes to encode in widget URL (stays under ~8 KB URL limit)
_MAX_PAYLOAD_BYTES = 5120


def _b64enc(obj: object) -> str:
    """Compact base64url-encode a JSON object (no padding)."""
    return base64.urlsafe_b64encode(
        json.dumps(obj, separators=(",", ":"), default=str).encode()
    ).decode().rstrip("=")


def widget_url(path: str, params: dict[str, str | int | float]) -> str:
    """Build a hosted widget URL for inline ChatGPT / connector embeds."""
    query = urlencode({k: v for k, v in params.items() if v is not None})
    return f"{WIDGET_BASE_URL}/widgets/{path}?{query}" if query else f"{WIDGET_BASE_URL}/widgets/{path}"


def enrich_response(
    result: dict,
    *,
    tool: str,
    widget_path: str | None = None,
    widget_params: dict[str, str | int | float] | None = None,
    followups: list[str] | None = None,
    shareable: str | None = None,
    display_mode: str = "inline",
) -> dict:
    """Attach visibility metadata without mutating error payloads.

    A2: Encodes clean API data in widget URL so the iframe avoids a second fetch.
    A5: Adds display_mode ("inline" | "fullscreen") to signal render target.
    U5: Encodes up to 2 follow-up suggestions in widget URL for chip display.
    """
    if result.get("error"):
        return result
    out = dict(result)
    if followups:
        out["suggested_followups"] = followups
    if shareable:
        out["shareable_summary"] = shareable
    if widget_path:
        params: dict[str, str | int | float] = dict(widget_params or {})

        # A2: embed clean API payload so widget skips re-fetch
        clean = {k: v for k, v in result.items() if k not in _META_KEYS}
        payload_json = json.dumps(clean, separators=(",", ":"), default=str)
        if len(payload_json) <= _MAX_PAYLOAD_BYTES:
            params["d"] = _b64enc(clean)

        # U5: embed first two follow-ups for chip display in widget footer
        if followups:
            params["f"] = _b64enc(followups[:2])

        out["widget_url"] = widget_url(widget_path, params)
        out["display_mode"] = display_mode  # A5

    out["_tool"] = tool
    return out


def format_postcode_display(postcode: str) -> str:
    """Insert space before inward code when missing (e.g. CH14AB -> CH1 4AB)."""
    pc = postcode.replace(" ", "").upper()
    if len(pc) >= 5:
        return f"{pc[:-3]} {pc[-3:]}"
    return pc


def build_briefing_shareable(report: dict) -> str:
    """Markdown block for briefing_for_postcode."""
    area = report.get("area") or {}
    pc = format_postcode_display(str(area.get("postcode", report.get("postcode", ""))))
    lines = [f"**MyAreaReport — {pc}**", ""]
    district = area.get("admin_district")
    region = area.get("region")
    if district or region:
        lines.append(f"_{', '.join(x for x in [district, region] if x)}_")
        lines.append("")
    crime = report.get("crime") or {}
    if crime.get("summary"):
        lines.append(f"**Crime:** {crime['summary']}")
    flood = report.get("flood") or {}
    if flood.get("summary"):
        lines.append(f"**Flood:** {flood['summary']}")
    planning = report.get("planning") or {}
    if planning.get("summary"):
        lines.append(f"**Planning:** {planning['summary']}")
    lines.extend(["", f"_{CAVEAT_FOOTER}_", "", "Sources: postcodes.io, police.uk, Environment Agency, planning.data.gov.uk"])
    return "\n".join(lines)


def build_compare_shareable(postcode_a: str, postcode_b: str, comparison: dict) -> str:
    """Neutral comparison summary for sharing."""
    pa = format_postcode_display(postcode_a)
    pb = format_postcode_display(postcode_b)
    crime = comparison.get("crime") or {}
    flood = comparison.get("flood") or {}
    lines = [
        f"**MyAreaReport — comparing {pa} and {pb}**",
        "",
        f"Reported incidents ({pa}): {crime.get('area_a_total', 'n/a')}",
        f"Reported incidents ({pb}): {crime.get('area_b_total', 'n/a')}",
        f"Active flood warnings ({pa}): {flood.get('area_a_warnings', 'n/a')}",
        f"Active flood warnings ({pb}): {flood.get('area_b_warnings', 'n/a')}",
        "",
        f"_{CAVEAT_FOOTER}_",
    ]
    return "\n".join(lines)


def build_carousel_shareable(items: list[dict]) -> str:
    lines = ["**MyAreaReport — postcode comparison**", ""]
    for item in items:
        pc = format_postcode_display(str(item.get("postcode", "")))
        incidents = item.get("total_incidents")
        warnings = item.get("flood_warnings")
        lines.append(f"- **{pc}**: {incidents} reported incidents; {warnings} flood warning(s)")
    lines.extend(["", f"_{CAVEAT_FOOTER}_"])
    return "\n".join(lines)
