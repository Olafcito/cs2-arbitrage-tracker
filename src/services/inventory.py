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
from src.models.inventory import (
    InventoryItem,
    InventoryResponse,
    InventorySnapshot,
    InventoryUsage,
)

logger = logging.getLogger(__name__)

_CACHE_FILE = PROJECT_DIR / "data" / "inventory.json"
_USAGE_FILE = PROJECT_DIR / "data" / "inventory_usage.json"
_MONTHLY_LIMIT = 5


# ---------------------------------------------------------------------------
# Usage tracking
# ---------------------------------------------------------------------------

def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _load_usage() -> InventoryUsage:
    month = _current_month()
    if _USAGE_FILE.exists():
        data = json.loads(_USAGE_FILE.read_text(encoding="utf-8"))
        if data.get("month") == month:
            return InventoryUsage.model_validate(data)
    # New month or no file — reset counter
    return InventoryUsage(
        month=month,
        syncs_this_month=0,
        syncs_remaining=_MONTHLY_LIMIT,
    )


def _increment_usage() -> InventoryUsage:
    usage = _load_usage()
    now = datetime.now(timezone.utc).isoformat()
    updated = usage.model_copy(update={
        "syncs_this_month": usage.syncs_this_month + 1,
        "syncs_remaining": max(0, _MONTHLY_LIMIT - usage.syncs_this_month - 1),
        "last_sync_at": now,
    })
    _USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _USAGE_FILE.write_text(
        json.dumps(updated.model_dump(), ensure_ascii=False),
        encoding="utf-8",
    )
    return updated


# ---------------------------------------------------------------------------
# Snapshot cache
# ---------------------------------------------------------------------------

def get_snapshot() -> InventorySnapshot | None:
    """Return the last cached inventory snapshot without any API calls."""
    if not _CACHE_FILE.exists():
        return None
    data = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    return InventorySnapshot.model_validate(data)


def get_inventory_response() -> InventoryResponse:
    """Return cached snapshot + current usage info. No API calls."""
    return InventoryResponse(snapshot=get_snapshot(), usage=_load_usage())


# ---------------------------------------------------------------------------
# Live fetch
# ---------------------------------------------------------------------------

def fetch_inventory(steam_id: str | None = None) -> InventoryResponse:
    """Fetch live inventory from SteamWebAPI, persist to cache, and return result.

    WARNING: Consumes one monthly API call (free tier: 5/month).
    Raises ValueError if no API key or Steam ID is configured.
    Raises RuntimeError if monthly limit has been reached.
    Raises requests.HTTPError on API errors.
    """
    key = STEAMWEBAPI_KEY
    sid = steam_id or STEAM_ID
    if not key:
        raise ValueError("steamwebapi_key is not configured in .env")
    if not sid:
        raise ValueError("steam_id is not configured in .env")

    usage = _load_usage()
    if usage.syncs_remaining <= 0:
        raise RuntimeError(
            f"Monthly inventory limit reached ({_MONTHLY_LIMIT}/month). "
            f"Resets next month ({usage.month})."
        )

    logger.warning(
        "Fetching Steam inventory for %s — %d/%d monthly calls used",
        sid, usage.syncs_this_month, _MONTHLY_LIMIT,
    )
    resp = requests.get(
        f"{STEAMWEBAPI_BASE_URL}/inventory",
        params={"key": key, "steam_id": sid},
        timeout=30,
    )
    resp.raise_for_status()

    raw: list[dict] = resp.json()
    if not isinstance(raw, list):
        raw = raw.get("data", []) if isinstance(raw, dict) else []

    items = [InventoryItem.model_validate(item) for item in raw]
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

    updated_usage = _increment_usage()
    logger.info("Inventory synced: %d items. %d syncs remaining this month.", len(items), updated_usage.syncs_remaining)
    return InventoryResponse(snapshot=snapshot, usage=updated_usage)
