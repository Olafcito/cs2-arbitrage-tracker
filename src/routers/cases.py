"""Routes: GET /cases (all cases from CSROI with arbitrage metrics)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.models.item import ArbitrageItem
from src.services.cases import get_all_cases, get_case_by_id

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=list[ArbitrageItem])
def list_cases(
    names: str | None = Query(None, description="Comma-separated case names to filter (case-insensitive)"),
) -> list[ArbitrageItem]:
    """Fetch ALL cases from CSROI ranked by multiplier. Optionally filter by name."""
    name_list = [n.strip() for n in names.split(",")] if names else None
    return get_all_cases(names=name_list)


@router.get("/{collection_id}", response_model=ArbitrageItem)
def get_case(collection_id: int) -> ArbitrageItem:
    """Get a single case by CSROI CollectionId."""
    item = get_case_by_id(collection_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"CollectionId {collection_id} not found")
    return item
