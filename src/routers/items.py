"""Routes: POST/GET/DELETE /items (tracked item CRUD) + sync endpoints."""

import time

from fastapi import APIRouter, BackgroundTasks, HTTPException

from src.models.item import ArbitrageItem, ItemInput
from src.services import items as items_svc
from src.services.steam import SteamRateLimitError, get_rate_limit_status

router = APIRouter(prefix="/items", tags=["Items"])


@router.post("", response_model=ArbitrageItem, status_code=201)
def create_item(inp: ItemInput) -> ArbitrageItem:
    """Add an item to track. Auto-resolves prices from CSROI + Steam."""
    try:
        return items_svc.add_item(inp.name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=list[ArbitrageItem])
def get_items() -> list[ArbitrageItem]:
    """List all tracked items."""
    return items_svc.list_items()


@router.get("/{name}", response_model=ArbitrageItem)
def get_item(name: str) -> ArbitrageItem:
    """Get a tracked item by name (case-insensitive)."""
    item = items_svc.get_tracked_item(name)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item not found: {name}")
    return item


@router.delete("/{name}", status_code=204)
def delete_item(name: str) -> None:
    """Remove a tracked item by name (case-insensitive)."""
    if not items_svc.remove_item(name):
        raise HTTPException(status_code=404, detail=f"Item not found: {name}")


@router.post("/sync-all", status_code=202)
def sync_all_items(background_tasks: BackgroundTasks) -> dict:
    """Sync all tracked items in the background. Returns immediately.

    Items update one at a time with 3s between Steam calls.
    Poll GET /items to see progress.
    """
    background_tasks.add_task(_sync_all_background)
    return {"message": "Sync started", "item_count": len(items_svc.list_items())}


@router.post("/{name}/sync", response_model=ArbitrageItem)
def sync_item(name: str) -> ArbitrageItem:
    """Sync a tracked item with live prices from CSFloat and Steam."""
    status = get_rate_limit_status()
    if status["retry_after_seconds"] is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Steam rate limit hit — retry in {status['retry_after_seconds']}s",
        )
    try:
        return items_svc.sync_item(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except SteamRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))


def _sync_all_background() -> None:
    all_items = items_svc.list_items()
    for item in all_items:
        try:
            items_svc.sync_item(item.name)
        except Exception:
            pass
        time.sleep(3)
