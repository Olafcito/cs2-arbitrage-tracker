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


class SteamRateLimitError(Exception):
    """Raised when Steam returns an HTML throttle page instead of JSON."""


def get_rate_limit_status() -> dict:
    """Return current rate limit state without blocking."""
    now = time.time()
    recent = [t for t in _request_times if now - t < 60]
    retry_after = None
    if len(recent) >= MAX_REQUESTS_PER_MINUTE and recent:
        oldest = min(recent)
        retry_after = round(max(0.0, 60.0 - (now - oldest)), 1)
    return {
        "requests_in_window": len(recent),
        "capacity": MAX_REQUESTS_PER_MINUTE,
        "retry_after_seconds": retry_after,
    }


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
    """Parse a Steam EUR price string like '1,23EUR' or 'EUR1.23' into a float.

    Steam EUR prices use comma as decimal separator (e.g. "1,23 EUR").
    The comma is converted to a dot before extraction.
    """
    if not raw:
        return None
    m = _PRICE_RE.search(raw.replace(",", "."))
    return float(m.group()) if m else None


def fetch_price_overview(market_hash_name: str) -> SteamPrice:
    """Call Steam priceoverview for a single item.

    Rate-limited to 20 requests per minute automatically.
    Raises SteamRateLimitError if Steam returns an HTML throttle page.
    """
    _wait_for_rate_limit()

    url = STEAM_PRICE_OVERVIEW_URL.format(
        name=requests.utils.quote(market_hash_name)
    )
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "text/html" in content_type or resp.text.strip().startswith("<"):
        raise SteamRateLimitError("Steam rate limit hit — retry in 60s")

    data = resp.json()

    return SteamPrice(
        lowest_price_eur=_parse_steam_price(data.get("lowest_price")),
        median_price_eur=_parse_steam_price(data.get("median_price")),
        volume_24h=int(data["volume"].replace(",", "")) if data.get("volume") else None,
    )
