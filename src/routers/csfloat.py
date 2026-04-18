"""Routes: GET /csfloat/listings — live CSFloat price lookup."""

from fastapi import APIRouter, HTTPException, Query

from src.services.csfloat import fetch_lowest_price
from src.utils import fetch_exchange_rate

router = APIRouter(prefix="/csfloat", tags=["CSFloat"])


@router.get("/listings")
def get_listings(
    market_hash_name: str = Query(..., description="Exact Steam market name"),
    min_float: float | None = Query(None, ge=0.0, le=1.0),
    max_float: float | None = Query(None, ge=0.0, le=1.0),
) -> dict:
    """Cheapest CSFloat listing for an item, optionally filtered by float range.

    Returns price in both USD and EUR. Prices from CSFloat are in cents → divided by 100.
    """
    price_usd = fetch_lowest_price(market_hash_name, min_float=min_float, max_float=max_float)
    if price_usd is None:
        raise HTTPException(status_code=404, detail="No listings found or CSFloat API key not configured")

    rate = fetch_exchange_rate()
    return {
        "market_hash_name": market_hash_name,
        "price_usd": round(price_usd, 2),
        "price_eur": round(price_usd * rate, 2),
        "min_float": min_float,
        "max_float": max_float,
    }
