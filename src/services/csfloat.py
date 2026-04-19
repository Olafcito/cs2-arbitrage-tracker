"""CSFloat API client — fetches live listing prices."""

import requests

from src.config import CSFLOAT_API_KEY, CSFLOAT_BASE_URL

# Valid sort_by values accepted by the CSFloat listings API
VALID_SORT_BY = {
    "lowest_price",
    "highest_price",
    "most_recent",
    "lowest_float",
    "highest_float",
    "best_deal",
}

# category: 0=any, 1=normal, 2=stattrak, 3=souvenir
VALID_CATEGORIES = {0, 1, 2, 3}

# listing type filter
VALID_TYPES = {"buy_now", "auction"}


def fetch_listings(
    market_hash_name: str,
    sort_by: str | None = "lowest_price",
    category: int | None = None,
    listing_type: str | None = None,
    min_float: float | None = None,
    max_float: float | None = None,
    limit: int = 10,
) -> list[dict]:
    """Return raw listing dicts from the CSFloat API.

    Returns an empty list if no API key is configured or no listings match.
    Raises requests.HTTPError on API errors.
    """
    if not CSFLOAT_API_KEY:
        return []

    params: dict = {
        "market_hash_name": market_hash_name,
        "limit": min(limit, 50),
    }
    if sort_by is not None:
        params["sort_by"] = sort_by
    if category is not None:
        params["category"] = category
    if listing_type is not None:
        params["type"] = listing_type
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
    return resp.json().get("data", [])


def fetch_lowest_price(
    market_hash_name: str,
    sort_by: str = "lowest_price",
    listing_type: str = "buy_now",
    category: int | None = None,
    min_float: float | None = None,
    max_float: float | None = None,
    price_discount: float = 1.0,
) -> float | None:
    """Return the cheapest CSFloat listing price in USD.

    Applies price_discount as a multiplier (e.g. 0.98 = 2% below market).
    Returns None if no API key configured or no listings found.
    """
    listings = fetch_listings(
        market_hash_name,
        sort_by=sort_by,
        listing_type=listing_type,
        category=category,
        min_float=min_float,
        max_float=max_float,
        limit=1,
    )
    if not listings:
        return None
    price_usd = listings[0]["price"] / 100
    return price_usd * price_discount
