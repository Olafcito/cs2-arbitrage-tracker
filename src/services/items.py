"""Service: tracked item CRUD with automatic price resolution."""

from __future__ import annotations

import json
from pathlib import Path

from src.config import PROJECT_DIR
from src.models.item import ArbitrageItem, CaseType, SkinType
from src.services.cases import find_case_by_name
from src.services.deals import find_deal_by_name
from src.services.steam import fetch_price_overview
from src.utils import build_arbitrage_item, fetch_exchange_rate

_ITEMS_FILE = PROJECT_DIR / "data" / "items.json"


def _load() -> list[ArbitrageItem]:
    if not _ITEMS_FILE.exists():
        return []
    raw = json.loads(_ITEMS_FILE.read_text(encoding="utf-8"))
    return [ArbitrageItem.model_validate(item) for item in raw]


def _save(items: list[ArbitrageItem]) -> None:
    _ITEMS_FILE.parent.mkdir(exist_ok=True)
    payload = [item.model_dump() for item in items]
    _ITEMS_FILE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def add_item(name: str) -> ArbitrageItem:
    """Add an item to track.

    Resolves CSFloat price from CSROI (cases then deals),
    fetches Steam price, computes arbitrage, and persists.

    Raises ValueError if CSFloat price cannot be resolved.
    """
    case = find_case_by_name(name)
    deal = None
    if case is not None:
        csf_price_usd = case.csf_price_usd
        steam_price_usd = case.steam_price_usd
    else:
        deal = find_deal_by_name(name)
        if deal is not None:
            csf_price_usd = deal.csf_price_usd
            steam_price_usd = deal.steam_price_usd
        else:
            raise ValueError(
                f"CSFloat price not available for '{name}'. "
                "Ensure the item exists in CSROI cases or deals. "
                "CSFloat API integration coming soon."
            )

    # Fetch live Steam price — prefer it over CSROI's steam price
    steam_price = fetch_price_overview(name)
    rate = fetch_exchange_rate()

    if steam_price.lowest_price_eur is not None and rate > 0:
        steam_price_usd = steam_price.lowest_price_eur / rate

    # Build item type
    if case is not None:
        item_type = CaseType(
            collection_id=case.collection_id,
            collection_type=case.collection_type,
            drop_type=case.drop_type,
            num_listings=case.num_listings,
            roi_csroi=case.roi_csroi,
            profit_prob=case.profit_prob,
        )
    else:
        item_type = SkinType()

    item = build_arbitrage_item(
        name=name,
        csf_price_usd=csf_price_usd,
        steam_price_usd=steam_price_usd,
        rate=rate,
        item_type=item_type,
        steam_price=steam_price,
    )

    # Persist
    items = _load()
    items = [i for i in items if i.name.lower() != name.lower()]
    items.append(item)
    _save(items)

    return item


def list_items() -> list[ArbitrageItem]:
    """List all tracked items."""
    return _load()


def get_tracked_item(name: str) -> ArbitrageItem | None:
    """Get a single tracked item by name (case-insensitive)."""
    lower = name.lower()
    for item in _load():
        if item.name.lower() == lower:
            return item
    return None


def remove_item(name: str) -> bool:
    """Remove a tracked item by name (case-insensitive). Returns True if found."""
    items = _load()
    filtered = [i for i in items if i.name.lower() != name.lower()]
    if len(filtered) == len(items):
        return False
    _save(filtered)
    return True
