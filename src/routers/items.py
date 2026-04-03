"""Routes: POST/GET/DELETE /items (tracked item CRUD)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.models.item import ArbitrageItem, ItemInput
from src.services.items import add_item, get_tracked_item, list_items, remove_item

router = APIRouter(prefix="/items", tags=["Items"])


@router.post("", response_model=ArbitrageItem, status_code=201)
def create_item(inp: ItemInput) -> ArbitrageItem:
    """Add an item to track.

    Auto-resolves CSFloat price from CSROI data (cases or deals).
    Fetches live Steam price. Computes arbitrage metrics and persists.
    """
    try:
        return add_item(inp.name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=list[ArbitrageItem])
def get_items() -> list[ArbitrageItem]:
    """List all tracked items."""
    return list_items()


@router.get("/{name}", response_model=ArbitrageItem)
def get_item(name: str) -> ArbitrageItem:
    """Get a tracked item by name (case-insensitive)."""
    item = get_tracked_item(name)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item not found: {name}")
    return item


@router.delete("/{name}", status_code=204)
def delete_item(name: str) -> None:
    """Remove a tracked item by name (case-insensitive)."""
    if not remove_item(name):
        raise HTTPException(status_code=404, detail=f"Item not found: {name}")
