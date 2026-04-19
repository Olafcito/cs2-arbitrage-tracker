"""Routes: GET /inventory (cached) and POST /inventory/sync (live fetch)."""

from fastapi import APIRouter, HTTPException

from src.models.inventory import InventorySnapshot
from src.services.inventory import fetch_inventory, get_snapshot

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=InventorySnapshot)
def get_inventory() -> InventorySnapshot:
    """Return the cached inventory snapshot.

    Does NOT call the SteamWebAPI — use POST /inventory/sync to refresh.
    Returns 404 if no snapshot has been fetched yet.
    """
    snapshot = get_snapshot()
    if snapshot is None:
        raise HTTPException(
            status_code=404,
            detail="No inventory snapshot found. Use POST /inventory/sync to fetch.",
        )
    return snapshot


@router.post("/sync", response_model=InventorySnapshot)
def sync_inventory() -> InventorySnapshot:
    """Fetch live inventory from SteamWebAPI and update the cache.

    WARNING: Consumes one API call against the monthly rate limit
    (free tier: 5/month). Only call this when you explicitly want a refresh.
    """
    try:
        return fetch_inventory()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
