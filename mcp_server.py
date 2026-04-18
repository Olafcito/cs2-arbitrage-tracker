"""CS2 Arbitrage Tracker — FastMCP server.

Usage:
    uv run mcp_server.py              # stdio (Claude Desktop)
    uv run mcp_server.py --http       # HTTP on port 8001 (remote / ngrok)

Tools exposed to Claude:
  - lookup_item   : Get CSFloat + Steam prices for any CS2 item
  - list_deals    : Top CSFloat deals below a ratio threshold
  - list_tracked  : Items you're tracking with current arbitrage metrics
  - add_to_tracker: Add an item to tracked list
"""

from __future__ import annotations

import re
import sys

from fastmcp import FastMCP

from src.services.deals import fetch_deals, scan_deals
from src.services.items import add_item, list_items
from src.services.steam import fetch_price_overview
from src.utils import fetch_exchange_rate

mcp = FastMCP("CS2 Arbitrage Tracker")

# ---------------------------------------------------------------------------
# Input parsing
# ---------------------------------------------------------------------------

_WEAR_TAGS = [
    "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"
]


def _parse_item_input(raw: str) -> str:
    """Normalise item input to a Steam market hash name.

    Accepts:
      - "Glock-18 | Warhawk\\tMinimal Wear\\t0.13"   (tab-separated from a CS inventory export)
      - "Glock-18 | Warhawk (Minimal Wear)"            (already formatted)
      - "Glock-18 | Warhawk Minimal Wear"              (space-separated)
    """
    raw = raw.strip()

    # Tab-separated: "Name\tWear\tFloat"
    if "\t" in raw:
        parts = [p.strip() for p in raw.split("\t")]
        name = parts[0]
        wear = parts[1] if len(parts) > 1 else ""
        if wear and not name.endswith(")"):
            name = f"{name} ({wear})"
        return name

    # Already has parentheses — good as-is
    if re.search(r"\([^)]+\)$", raw):
        return raw

    # Wear tag appended without parentheses
    for tag in _WEAR_TAGS:
        if raw.endswith(tag):
            name_part = raw[: -len(tag)].rstrip()
            return f"{name_part} ({tag})"

    return raw


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool
def lookup_item(item: str) -> str:
    """Look up CSFloat and Steam prices for a CS2 item.

    The `item` parameter accepts:
    - Tab-separated inventory format: "Glock-18 | Warhawk\\tMinimal Wear\\t0.13"
    - Standard name: "Glock-18 | Warhawk (Minimal Wear)"

    Returns CSFloat price (from CSROI aggregation), live Steam price, multiplier,
    and profit metrics.
    """
    name = _parse_item_input(item)

    rate = fetch_exchange_rate()
    steam = fetch_price_overview(name)

    # Try to find CSFloat price via CSROI deals list
    all_deals = scan_deals(max_ratio=0.99)
    csf_match = next((d for d in all_deals if d.name.lower() == name.lower()), None)

    lines = [f"**{name}**", ""]

    if csf_match:
        csf_eur = csf_match.csf_price_usd * rate
        csf_with_fee = csf_eur * 1.028
        mult = csf_match.multiplier
        profit = (mult - 1) * 100
        lines += [
            f"CSFloat price : ${csf_match.csf_price_usd:.2f} USD  /  €{csf_eur:.2f} EUR (+fee €{csf_with_fee:.2f})",
            f"CSROI Steam   : ${csf_match.csroi_steam_price_usd:.2f} USD",
        ]
    else:
        lines.append("CSFloat price : not found in CSROI deals (item may not be listed on CSFloat)")
        mult = None
        profit = None

    if steam.lowest_price_eur is not None:
        steam_net = steam.lowest_price_eur / 1.15
        lines.append(f"Steam low     : €{steam.lowest_price_eur:.2f} EUR  (net after 15% fee: €{steam_net:.2f})")
    if steam.median_price_eur is not None:
        lines.append(f"Steam median  : €{steam.median_price_eur:.2f} EUR")
    if steam.volume_24h is not None:
        lines.append(f"Volume 24h    : {steam.volume_24h:,}")

    if csf_match and steam.lowest_price_eur:
        csf_eur = csf_match.csf_price_usd * rate
        csf_with_fee = csf_eur * 1.028
        steam_net = steam.lowest_price_eur / 1.15
        mult_live = steam_net / csf_with_fee
        profit_live = (mult_live - 1) * 100
        lines += [
            "",
            f"Live multiplier: {mult_live:.3f}x  ({profit_live:+.1f}% profit per €100 spent)",
            f"CSROI mult     : {csf_match.multiplier:.3f}x",
        ]

    lines += ["", f"USD→EUR rate  : {rate:.5f}"]
    return "\n".join(lines)


@mcp.tool
def list_deals(max_ratio: float = 0.6, limit: int = 10) -> str:
    """List top CS2 items on CSFloat that are underpriced vs Steam.

    Args:
        max_ratio: Maximum CSFloat/Steam price ratio (lower = better deal). Default 0.6.
        limit: Number of results to return. Default 10.
    """
    rate = fetch_exchange_rate()
    deals = scan_deals(max_ratio=max_ratio)[:limit]

    if not deals:
        return f"No deals found at ratio ≤ {max_ratio}."

    header = f"{'#':<3} {'Name':<45} {'CSF $':>7} {'Steam $':>8} {'Ratio':>6} {'Mult':>6}"
    sep = "-" * len(header)
    rows = [header, sep]
    for i, d in enumerate(deals, 1):
        csf_eur = d.csf_price_usd * rate
        rows.append(
            f"{i:<3} {d.name:<45} ${d.csf_price_usd:>6.2f}  ${d.csroi_steam_price_usd:>7.2f}  {d.csroi_ratio:>5.3f}  {d.multiplier:>5.2f}x"
        )

    rows.append(f"\nUSD→EUR rate: {rate:.5f}")
    return "\n".join(rows)


@mcp.tool
def list_tracked() -> str:
    """List all CS2 items currently tracked, with live arbitrage metrics."""
    items = list_items()
    if not items:
        return "No items tracked yet. Use add_to_tracker to add one."

    header = f"{'Name':<45} {'CSF €':>7} {'Steam €':>8} {'Mult':>6} {'Profit/100':>10}"
    sep = "-" * len(header)
    rows = [header, sep]
    for it in sorted(items, key=lambda x: x.multiplier, reverse=True):
        rows.append(
            f"{it.name:<45} €{it.csf_price_eur:>6.2f}  €{it.steam_price_eur:>7.2f}  {it.multiplier:>5.3f}x  {it.profit_per_100_eur:>+8.1f}%"
        )
    return "\n".join(rows)


@mcp.tool
def add_to_tracker(item: str) -> str:
    """Add a CS2 item to your tracked list.

    Resolves CSFloat + Steam prices and saves. Use the same input formats
    as lookup_item (tab-separated or standard name).
    """
    name = _parse_item_input(item)
    try:
        result = add_item(name)
        return (
            f"Added: {result.name}\n"
            f"  CSFloat : €{result.csf_price_eur:.2f} (+fee €{result.csf_cost_with_fee_eur:.2f})\n"
            f"  Steam   : €{result.steam_price_eur:.2f}\n"
            f"  Mult    : {result.multiplier:.3f}x  ({result.profit_per_100_eur:+.1f}% per €100)"
        )
    except ValueError as e:
        return f"Could not add '{name}': {e}"


if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run(transport="http", host="0.0.0.0", port=8001)
    else:
        mcp.run()
