"""Service: Steam inventory fetch and cache.

RATE LIMITS (free tier — SteamWebAPI):
  Inventory endpoint: 2 req/min · 5 req/day · 5 req/month
  Only call fetch_inventory() on explicit user action. Never auto-refresh.
"""

import json
import logging
from datetime import datetime, timezone

import requests

from src.config import PROJECT_DIR, STEAM_ID, STEAMWEBAPI_BASE_URL, STEAMWEBAPI_KEY
from src.models.inventory import InventoryItem, InventorySnapshot

logger = logging.getLogger(__name__)

_CACHE_FILE = PROJECT_DIR / "data" / "inventory.json"


def get_snapshot() -> InventorySnapshot | None:
    """Return the last cached inventory snapshot without making any API calls."""
    if not _CACHE_FILE.exists():
        return None
    data = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    return InventorySnapshot.model_validate(data)


def fetch_inventory(steam_id: str | None = None) -> InventorySnapshot:
    """Fetch live inventory from SteamWebAPI and persist to cache.

    WARNING: Consumes one monthly API call. Call only on explicit user request.
    Raises ValueError if no API key or Steam ID is configured.
    Raises requests.HTTPError on API errors.
    """
    key = STEAMWEBAPI_KEY
    sid = steam_id or STEAM_ID
    if not key:
        raise ValueError("steamwebapi_key is not configured in .env")
    if not sid:
        raise ValueError("steam_id is not configured in .env")

    logger.info("Fetching Steam inventory for %s (burns monthly rate limit)", sid)
    resp = requests.get(
        f"{STEAMWEBAPI_BASE_URL}/inventory",
        params={"key": key, "steam_id": sid},
        timeout=30,
    )
    resp.raise_for_status()

    raw_items: list[dict] = resp.json()
    if not isinstance(raw_items, list):
        raw_items = raw_items.get("data", []) if isinstance(raw_items, dict) else []

    items = [InventoryItem.model_validate(item) for item in raw_items]
    snapshot = InventorySnapshot(
        fetched_at=datetime.now(timezone.utc),
        steam_id=sid,
        item_count=len(items),
        items=items,
    )

    _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_FILE.write_text(
        json.dumps(snapshot.model_dump(), ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    logger.info("Inventory synced: %d items persisted to cache", len(items))
    return snapshot
