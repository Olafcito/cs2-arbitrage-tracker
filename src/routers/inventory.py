"""Routes: GET /inventory (cached) and POST /inventory/sync (live fetch)."""

from fastapi import APIRouter, HTTPException

from src.models.inventory import InventoryResponse
from src.services.inventory import fetch_inventory, get_inventory_response

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("", response_model=InventoryResponse)
def get_inventory() -> InventoryResponse:
    """Return cached inventory snapshot + usage info.

    Does NOT call the SteamWebAPI. Use POST /inventory/sync to refresh.
    Returns a response with snapshot=null if no sync has been done yet.
    """
    return get_inventory_response()


@router.post("/sync", response_model=InventoryResponse)
def sync_inventory() -> InventoryResponse:
    """Fetch live inventory from SteamWebAPI, update cache, and return result.

    WARNING: Consumes one call against the monthly rate limit (free tier: 5/month).
    Only call this when you explicitly want a refresh.
    Returns 503 if API keys are missing or monthly limit is exhausted.
    """
    try:
        return fetch_inventory()
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
