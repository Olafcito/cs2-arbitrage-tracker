"""Service: case opening session CRUD + item sync."""

import json
import logging
import time
import uuid
from datetime import datetime, timezone

from src.config import PROJECT_DIR
from src.models.case_opening import (
    CaseOpening,
    CaseOpeningCreate,
    CaseOpeningItem,
    CaseOpeningItemInput,
    CaseOpeningItemPatch,
    CaseOpeningItemStatusPatch,
    CaseOpeningPatch,
    CaseOpeningSummary,
    StatusEvent,
)
from src.services.csfloat import fetch_listing_data
from src.services.steam import SteamRateLimitError, fetch_price_overview
from src.utils import fetch_exchange_rate

logger = logging.getLogger(__name__)

_DATA_DIR = PROJECT_DIR / "data" / "case_openings"

# 2% discount applied to CSFloat lowest price when placing a buy order
_CSF_PRICE_DISCOUNT = 0.98
# CSFloat seller fee: 2% deducted from your proceeds
_CSF_SELLER_FEE = 0.98
# Steam seller fee divisor
_STEAM_FEE_DIVISOR = 1.15


def _path(session_id: str):
    return _DATA_DIR / f"{session_id}.json"


def _compute_item_fields(item: CaseOpeningItem) -> CaseOpeningItem:
    """Compute derived per-item fields from stored prices."""
    csf_realized = item.csf_price_eur * _CSF_SELLER_FEE if item.csf_price_eur is not None else None
    if csf_realized is not None and item.steam_price_eur is not None and csf_realized > 0:
        item_mult = (item.steam_price_eur / _STEAM_FEE_DIVISOR) / csf_realized
    else:
        item_mult = None
    return item.model_copy(update={
        "csf_realized_eur": csf_realized,
        "item_multiplier": item_mult,
    })


def _compute_rois(session: CaseOpening) -> CaseOpening:
    items = [_compute_item_fields(i) for i in session.items]
    n = len(items)
    if n == 0 or session.unbox_price <= 0:
        return session.model_copy(update={"items": items})

    csf_realized_values = [i.csf_realized_eur for i in items if i.csf_realized_eur is not None]
    steam_values = [i.steam_price_eur for i in items if i.steam_price_eur is not None]

    total_csf = sum(csf_realized_values) if csf_realized_values else None
    total_steam_net = sum(v / _STEAM_FEE_DIVISOR for v in steam_values) if steam_values else None

    csf_roi = total_csf / (n * session.unbox_price) if total_csf is not None else None
    steam_roi = total_steam_net / (n * session.unbox_price) if total_steam_net is not None else None
    csf_roi_mult = csf_roi * session.multiplier if csf_roi is not None else None

    return session.model_copy(update={
        "items": items,
        "csf_roi": csf_roi,
        "steam_roi": steam_roi,
        "csf_roi_multiplied": csf_roi_mult,
        "total_csf_value": total_csf,
        "total_steam_net": total_steam_net,
    })


def _load(session_id: str) -> CaseOpening | None:
    p = _path(session_id)
    if not p.exists():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    # Backfill for sessions created before last_event_at was added
    if "last_event_at" not in data:
        data["last_event_at"] = data.get("created_at", datetime.now(timezone.utc).isoformat())
    return CaseOpening.model_validate(data)


def _save(session: CaseOpening) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = session.model_dump()
    _path(session.id).write_text(
        json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8"
    )


def list_sessions() -> list[CaseOpeningSummary]:
    if not _DATA_DIR.exists():
        return []
    summaries = []
    for p in sorted(_DATA_DIR.glob("*.json")):
        try:
            raw = CaseOpening.model_validate(json.loads(p.read_text(encoding="utf-8")))
        except Exception:
            logger.warning("Skipping corrupt session file: %s", p.name)
            continue
        computed = _compute_rois(raw)
        summaries.append(CaseOpeningSummary(
            id=raw.id,
            name=raw.name,
            date=raw.date,
            item_count=len(raw.items),
            unbox_price=raw.unbox_price,
            multiplier=raw.multiplier,
            csf_roi=computed.csf_roi,
            steam_roi=computed.steam_roi,
            last_event_at=raw.last_event_at,
        ))
    return summaries


def get_session(session_id: str) -> CaseOpening | None:
    raw = _load(session_id)
    if raw is None:
        return None
    return _compute_rois(raw)


def create_session(inp: CaseOpeningCreate) -> CaseOpening:
    now = datetime.now(timezone.utc)
    session = CaseOpening(
        id=str(uuid.uuid4()),
        name=inp.name,
        date=inp.date,
        unbox_price=inp.unbox_price,
        multiplier=inp.multiplier,
        created_at=now,
        last_event_at=now,
    )
    _save(session)
    logger.info("Created session %s (%s)", session.id, session.name)
    return _compute_rois(session)


def update_session(session_id: str, patch: CaseOpeningPatch) -> CaseOpening | None:
    session = _load(session_id)
    if session is None:
        return None
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    updated = session.model_copy(update=updates)
    _save(updated)
    return _compute_rois(updated)


def delete_session(session_id: str) -> bool:
    p = _path(session_id)
    if not p.exists():
        return False
    p.unlink()
    logger.info("Deleted session %s", session_id)
    return True


def add_item(session_id: str, inp: CaseOpeningItemInput) -> CaseOpening | None:
    session = _load(session_id)
    if session is None:
        return None
    now = datetime.now(timezone.utc)
    item = CaseOpeningItem(
        name=inp.name,
        wear=inp.wear,
        float_value=inp.float_value,
        stattrak=inp.stattrak,
        status="opened",
        status_updated_at=now,
        status_history=[StatusEvent(status="opened", changed_at=now)],
        created_at=now,
    )
    updated = session.model_copy(update={"items": [*session.items, item], "last_event_at": now})
    _save(updated)
    logger.info("Added item '%s' to session %s — triggering sync", inp.name, session_id)
    # Auto-sync the newly added item
    index = len(updated.items) - 1
    try:
        return sync_item(session_id, index)
    except Exception as exc:
        logger.warning("Auto-sync failed for item '%s': %s", inp.name, exc)
        return _compute_rois(updated)


def remove_item(session_id: str, index: int) -> CaseOpening | None:
    session = _load(session_id)
    if session is None or index < 0 or index >= len(session.items):
        return None
    items = [i for j, i in enumerate(session.items) if j != index]
    updated = session.model_copy(update={"items": items})
    _save(updated)
    return _compute_rois(updated)


def update_item_status(
    session_id: str,
    item_id: str,
    patch: CaseOpeningItemStatusPatch,
) -> CaseOpening | None:
    """Update status and marketplace for a specific item, recording history."""
    session = _load(session_id)
    if session is None:
        return None

    idx = next((i for i, item in enumerate(session.items) if item.id == item_id), None)
    if idx is None:
        return None

    item = session.items[idx]
    now = datetime.now(timezone.utc)

    # Determine the sale_price to persist on the item
    if patch.status in ("for_sale", "sold"):
        # Use the provided price; fall back to existing if transitioning for_sale→sold
        new_sale_price = patch.sale_price if patch.sale_price is not None else item.sale_price
    else:
        # Reverting to opened/delisted clears the sale price
        new_sale_price = None

    event = StatusEvent(
        status=patch.status,
        marketplace=patch.marketplace,
        sale_price=new_sale_price,
        changed_at=now,
    )
    updated_item = item.model_copy(update={
        "status": patch.status,
        "marketplace": patch.marketplace,
        "sale_price": new_sale_price,
        "status_updated_at": now,
        "status_history": [*item.status_history, event],
    })
    items = [updated_item if i == idx else it for i, it in enumerate(session.items)]
    updated = session.model_copy(update={"items": items, "last_event_at": now})
    _save(updated)
    logger.info(
        "Item %s in session %s: status → %s (marketplace: %s)",
        item_id, session_id, patch.status, patch.marketplace,
    )
    return _compute_rois(updated)


def update_item(session_id: str, item_id: str, patch: CaseOpeningItemPatch) -> CaseOpening | None:
    """Edit name, wear, or float of a specific item. Clears prices if market hash changes."""
    session = _load(session_id)
    if session is None:
        return None
    idx = next((i for i, item in enumerate(session.items) if item.id == item_id), None)
    if idx is None:
        return None
    item = session.items[idx]
    updates: dict = {}
    if patch.name is not None:
        updates["name"] = patch.name
    if patch.wear is not None:
        updates["wear"] = patch.wear
    if patch.float_value is not None:
        updates["float_value"] = patch.float_value
    if patch.stattrak is not None:
        updates["stattrak"] = patch.stattrak
    # If the market hash name changed, stale prices are misleading — clear them
    name_changed = patch.name is not None and patch.name != item.name
    wear_changed = patch.wear is not None and patch.wear != item.wear
    stattrak_changed = patch.stattrak is not None and patch.stattrak != item.stattrak
    if name_changed or wear_changed or stattrak_changed:
        updates.update({
            "csf_price_eur": None,
            "csf_realized_eur": None,
            "steam_price_eur": None,
            "item_multiplier": None,
            "last_synced_at": None,
        })
    now = datetime.now(timezone.utc)
    updated_item = item.model_copy(update=updates)
    items = [updated_item if i == idx else it for i, it in enumerate(session.items)]
    updated = session.model_copy(update={"items": items, "last_event_at": now})
    _save(updated)
    logger.info("Updated item %s in session %s: %s", item_id, session_id, updates.keys())
    return _compute_rois(updated)


def sync_item(session_id: str, index: int) -> CaseOpening | None:
    session = _load(session_id)
    if session is None or index < 0 or index >= len(session.items):
        return None

    item = session.items[index]
    if item.status == "sold":
        logger.debug("Skipping sync for sold item '%s' in session %s", item.name, session_id)
        return _compute_rois(session)
    rate = fetch_exchange_rate()
    prefix = "StatTrak\u2122 " if item.stattrak else ""
    market_hash_name = f"{prefix}{item.name} ({item.wear})"
    listing = fetch_listing_data(
        market_hash_name,
        category=2 if item.stattrak else None,
        min_float=item.float_value,
      #  price_discount=_CSF_PRICE_DISCOUNT,
    )
    
    # Fallback in cases where item has the highest float within its wear.
    if listing is None:
        listing = fetch_listing_data(
            market_hash_name,
            category=2 if item.stattrak else None,
          #  price_discount=_CSF_PRICE_DISCOUNT,
    )


    csf_eur = listing.price_usd * rate if listing is not None else item.csf_price_eur

    steam = fetch_price_overview(market_hash_name) 
    
    # Use median price — more stable than lowest for sell-side decisions
    steam_eur = steam.median_price_eur if steam.median_price_eur is not None else steam.lowest_price_eur if steam.lowest_price_eur is not None else item.steam_price_eur

    synced_item = item.model_copy(update={
        "csf_price_eur": csf_eur,
        "steam_price_eur": steam_eur,
        "rarity": listing.rarity if listing is not None else item.rarity,
        "icon_url": listing.icon_url if listing is not None else item.icon_url,
        "last_synced_at": datetime.now(timezone.utc),
    })
    items = [synced_item if j == index else i for j, i in enumerate(session.items)]
    updated = session.model_copy(update={"items": items})
    _save(updated)
    logger.debug("Synced item '%s' in session %s (idx %d)", item.name, session_id, index)
    return _compute_rois(updated)


def sync_session_background(session_id: str) -> None:
    session = _load(session_id)
    if session is None:
        return
    logger.info("Background sync started for session %s (%d items)", session_id, len(session.items))
    for i in range(len(session.items)):
        try:
            sync_item(session_id, i)
        except SteamRateLimitError:
            logger.warning("Steam rate limit hit during background sync — stopping at index %d", i)
            break
        except Exception as exc:
            logger.warning("Sync failed for item index %d in session %s: %s", i, session_id, exc)
        time.sleep(3)
    logger.info("Background sync finished for session %s", session_id)
