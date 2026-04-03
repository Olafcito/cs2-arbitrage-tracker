"""Steam Market API — priceoverview lookups with rate limiting."""

from __future__ import annotations

import re
import time
from collections import deque

import requests

from src.config import STEAM_PRICE_OVERVIEW_URL
from src.models.steam import SteamPrice

_PRICE_RE = re.compile(r"[\d]+[.,][\d]+")

# ---------------------------------------------------------------------------
# Rate limiter: max 20 requests per 60 seconds
# ---------------------------------------------------------------------------

MAX_REQUESTS_PER_MINUTE = 20
_request_times: deque[float] = deque(maxlen=MAX_REQUESTS_PER_MINUTE)


def _wait_for_rate_limit() -> None:
    """Block until we can make a request within the rate limit."""
    now = time.time()
    if len(_request_times) >= MAX_REQUESTS_PER_MINUTE:
        oldest = _request_times[0]
        wait = 60 - (now - oldest)
        if wait > 0:
            time.sleep(wait)
    _request_times.append(time.time())


def _parse_steam_price(raw: str | None) -> float | None:
    """Parse a Steam price string like '1,23EUR' or 'EUR1.23' into a float."""
    if not raw:
        return None
    m = _PRICE_RE.search(raw.replace(",", "."))
    return float(m.group()) if m else None


def fetch_price_overview(market_hash_name: str) -> SteamPrice:
    """Call Steam priceoverview for a single item.

    Rate-limited to 20 requests per minute automatically.
    Returns a SteamPrice model directly.
    """
    _wait_for_rate_limit()

    url = STEAM_PRICE_OVERVIEW_URL.format(
        name=requests.utils.quote(market_hash_name)
    )
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    return SteamPrice(
        lowest_price_eur=_parse_steam_price(data.get("lowest_price")),
        median_price_eur=_parse_steam_price(data.get("median_price")),
        volume_24h=int(data["volume"].replace(",", "")) if data.get("volume") else None,
    )
