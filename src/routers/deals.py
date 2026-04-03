"""Routes: GET /deals (CSFloat arbitrage opportunities)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.models.deal import Deal
from src.services.deals import scan_deals, verify_deals

router = APIRouter(prefix="/deals", tags=["Deals"])


@router.get("", response_model=list[Deal])
def list_deals(
    max_ratio: float = Query(0.60, description="Max CSROI ratio (0.60 = >40% discount)"),
    verify: bool = Query(False, description="Verify prices against Steam (slow, rate-limited)"),
    limit: int = Query(20, description="Max items to verify against Steam"),
) -> list[Deal]:
    """CSFloat items with best arbitrage ratios.

    Set verify=true to cross-check against live Steam prices (rate-limited to 20/min).
    """
    deals = scan_deals(max_ratio=max_ratio)
    if verify and deals:
        verify_deals(deals, max_items=limit)
    return deals
