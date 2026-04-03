"""Service: case arbitrage — fetches from CSROI, computes metrics."""

from __future__ import annotations

import requests

from src.config import CSROI_ALL_CASES_URL
from src.models.csroi import CsroiCase
from src.models.item import ArbitrageItem, CaseType
from src.utils import build_arbitrage_item, fetch_exchange_rate


def fetch_cases() -> list[CsroiCase]:
    """Fetch all tracked cases from CSROI."""
    resp = requests.get(CSROI_ALL_CASES_URL, timeout=30)
    resp.raise_for_status()
    return [CsroiCase.model_validate(item) for item in resp.json()]


def _case_type(case: CsroiCase) -> CaseType:
    return CaseType(
        collection_id=case.collection_id,
        collection_type=case.collection_type,
        drop_type=case.drop_type,
        num_listings=case.num_listings,
        roi_csroi=case.roi_csroi,
        profit_prob=case.profit_prob,
    )


def get_all_cases(names: list[str] | None = None) -> list[ArbitrageItem]:
    """Fetch all cases from CSROI, compute arbitrage, return ranked list.

    Optionally filter by names (case-insensitive).
    """
    cases = fetch_cases()
    rate = fetch_exchange_rate()

    if names:
        name_set = {n.lower() for n in names}
        cases = [c for c in cases if c.name.lower() in name_set]
    else:
        cases = [c for c in cases if c.collection_type == "Case"]

    items = [
        build_arbitrage_item(
            name=c.name,
            csf_price_usd=c.csf_price_usd,
            steam_price_usd=c.steam_price_usd,
            rate=rate,
            item_type=_case_type(c),
        )
        for c in cases
    ]
    items.sort(key=lambda i: i.multiplier, reverse=True)
    return items


def get_case_by_id(collection_id: int) -> ArbitrageItem | None:
    """Fetch cases from CSROI and return a single case by CollectionId."""
    cases = fetch_cases()
    rate = fetch_exchange_rate()

    for case in cases:
        if case.collection_id == collection_id:
            return build_arbitrage_item(
                name=case.name,
                csf_price_usd=case.csf_price_usd,
                steam_price_usd=case.steam_price_usd,
                rate=rate,
                item_type=_case_type(case),
            )
    return None


def find_case_by_name(name: str) -> CsroiCase | None:
    """Fetch cases and find one by name (case-insensitive). Used by items service."""
    cases = fetch_cases()
    lower = name.lower()
    for case in cases:
        if case.name.lower() == lower:
            return case
    return None


def find_cases_by_names(names: list[str]) -> tuple[list[CsroiCase], list[str]]:
    """Fetch cases and find multiple by name. Returns (matched, missing)."""
    cases = fetch_cases()
    lookup = {n.lower(): n for n in names}
    matched: list[CsroiCase] = []
    found: set[str] = set()
    for case in cases:
        key = case.name.lower()
        if key in lookup:
            matched.append(case)
            found.add(key)
    missing = [lookup[k] for k in lookup if k not in found]
    return matched, missing
