"""Routes: GET /lookup (pure Steam Market price lookup)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.models.steam import SteamPrice
from src.services.steam import fetch_price_overview

router = APIRouter(prefix="/lookup", tags=["Lookup"])


@router.get("", response_model=SteamPrice)
def steam_lookup(
    name: str = Query(..., description="Item name, e.g. 'AK-47 | Redline (Field-Tested)'"),
) -> SteamPrice:
    """Look up any item by name against Steam Market. Returns price + volume."""
    return fetch_price_overview(name)
