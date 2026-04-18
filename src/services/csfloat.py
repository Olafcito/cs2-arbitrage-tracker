"""CSFloat API client — fetches live listing prices."""

import requests

from src.config import CSFLOAT_API_KEY, CSFLOAT_BASE_URL


def fetch_lowest_price(market_hash_name: str) -> float | None:
    """Return the lowest CSFloat listing price in USD for an item.

    Returns None if no API key is configured or no listings are found.
    Price is converted from cents (CSFloat stores integers) to dollars.
    """
    if not CSFLOAT_API_KEY:
        return None

    resp = requests.get(
        f"{CSFLOAT_BASE_URL}/listings",
        params={"market_hash_name": market_hash_name, "sort_by": "lowest_price", "limit": 1},
        headers={"Authorization": CSFLOAT_API_KEY},
        timeout=10,
    )
    resp.raise_for_status()

    listings = resp.json().get("data", [])
    if not listings:
        return None

    return listings[0]["price"] / 100
