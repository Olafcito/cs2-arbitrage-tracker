"""Routes: /csfloat/listing (single price) and /csfloat/listings (raw objects)."""

from fastapi import APIRouter, HTTPException, Query

from src.services.csfloat import VALID_CATEGORIES, VALID_SORT_BY, VALID_TYPES, fetch_listings, fetch_lowest_price
from src.utils import fetch_exchange_rate

router = APIRouter(prefix="/csfloat", tags=["CSFloat"])


@router.get("/listing")
def get_listing(
    market_hash_name: str = Query(..., description="Exact Steam market hash name"),
    sort_by: str = Query("lowest_price", description=f"One of: {', '.join(sorted(VALID_SORT_BY))}"),
    category: int | None = Query(None, description="0=any, 1=normal, 2=stattrak, 3=souvenir"),
    listing_type: str | None = Query(None, alias="type", description="buy_now or auction"),
    min_float: float | None = Query(None, ge=0.0, le=1.0),
    max_float: float | None = Query(None, ge=0.0, le=1.0),
    price_discount: float = Query(1.0, ge=0.0, le=1.0, description="Multiplier applied to price (e.g. 0.98 = 2% below)"),
) -> dict:
    """Cheapest CSFloat listing for an item with full filter support.

    Returns price in USD and EUR after applying price_discount.
    """
    if sort_by not in VALID_SORT_BY:
        raise HTTPException(status_code=422, detail=f"sort_by must be one of {sorted(VALID_SORT_BY)}")
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=422, detail="category must be 0, 1, 2, or 3")
    if listing_type is not None and listing_type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {sorted(VALID_TYPES)}")

    price_usd = fetch_lowest_price(
        market_hash_name,
        sort_by=sort_by,
        listing_type=listing_type or "buy_now",
        category=category,
        min_float=min_float,
        max_float=max_float,
        price_discount=price_discount,
    )
    if price_usd is None:
        raise HTTPException(status_code=404, detail="No listings found or CSFloat API key not configured")

    rate = fetch_exchange_rate()
    return {
        "market_hash_name": market_hash_name,
        "price_usd": round(price_usd, 4),
        "price_eur": round(price_usd * rate, 4),
        "sort_by": sort_by,
        "category": category,
        "type": listing_type,
        "min_float": min_float,
        "max_float": max_float,
        "price_discount": price_discount,
    }


@router.get("/listings")
def get_listings(
    market_hash_name: str = Query(..., description="Exact Steam market hash name"),
    sort_by: str = Query("lowest_price", description=f"One of: {', '.join(sorted(VALID_SORT_BY))}"),
    category: int | None = Query(None, description="0=any, 1=normal, 2=stattrak, 3=souvenir"),
    listing_type: str | None = Query(None, alias="type", description="buy_now or auction"),
    min_float: float | None = Query(None, ge=0.0, le=1.0),
    max_float: float | None = Query(None, ge=0.0, le=1.0),
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    """Raw CSFloat listing objects for an item.

    Returns the full listing payload from the CSFloat API (up to 50).
    """
    if sort_by not in VALID_SORT_BY:
        raise HTTPException(status_code=422, detail=f"sort_by must be one of {sorted(VALID_SORT_BY)}")
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=422, detail="category must be 0, 1, 2, or 3")
    if listing_type is not None and listing_type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {sorted(VALID_TYPES)}")

    listings = fetch_listings(
        market_hash_name,
        sort_by=sort_by,
        category=category,
        listing_type=listing_type,
        min_float=min_float,
        max_float=max_float,
        limit=limit,
    )
    if not listings:
        raise HTTPException(status_code=404, detail="No listings found or CSFloat API key not configured")
    return listings
