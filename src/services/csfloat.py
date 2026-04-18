"""CSFloat API client — fetches live listing prices."""

import requests

from src.config import CSFLOAT_API_KEY, CSFLOAT_BASE_URL


def fetch_lowest_price(
    market_hash_name: str,
    min_float: float | None = None,
    max_float: float | None = None,
) -> float | None:
    """Return the lowest CSFloat listing price in USD cents converted to dollars.

    Returns None if no API key is configured or no listings are found.
    Optionally filters by float range — useful for targeting specific wear tiers.
    """
    if not CSFLOAT_API_KEY:
        return None

    params: dict = {
        "market_hash_name": market_hash_name,
        "sort_by": "lowest_price",
        "limit": 1,
    }
    if min_float is not None:
        params["min_float"] = min_float
    if max_float is not None:
        params["max_float"] = max_float

    resp = requests.get(
        f"{CSFLOAT_BASE_URL}/listings",
        params=params,
        headers={"Authorization": CSFLOAT_API_KEY},
        timeout=10,
    )
    resp.raise_for_status()

    listings = resp.json().get("data", [])
    if not listings:
        return None

    return listings[0]["price"] / 100
