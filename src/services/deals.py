"""Service: deal scanning — fetches from CSROI marketRatios, filters, verifies."""

from __future__ import annotations

import time

import requests

from src.config import CSROI_MARKET_RATIOS_URL, STEAM_FEE_DIVISOR
from src.models.csroi import CsroiDealItem
from src.models.deal import Deal
from src.services.steam import fetch_price_overview
from src.utils import compute_multiplier, fetch_exchange_rate


def fetch_deals() -> list[CsroiDealItem]:
    """Fetch CSFloat market ratios from CSROI."""
    cache_bust = str(int(time.time() * 1000))
    resp = requests.get(f"{CSROI_MARKET_RATIOS_URL}?v={cache_bust}", timeout=30)
    resp.raise_for_status()
    csfloat_ratios = resp.json().get("csfloat", {}).get("ratios", [])
    return [CsroiDealItem.model_validate(item) for item in csfloat_ratios]


def find_deal_by_name(name: str) -> CsroiDealItem | None:
    """Fetch deals and find one by name (case-insensitive). Used by items service."""
    deals = fetch_deals()
    lower = name.lower()
    for deal in deals:
        if deal.name.lower() == lower:
            return deal
    return None


def _liquidity_label(volume: int | None) -> str:
    if volume is None:
        return "unknown"
    if volume >= 50:
        return "high"
    if volume >= 10:
        return "medium"
    return "low"


def scan_deals(max_ratio: float = 0.60) -> list[Deal]:
    """Fetch CSFloat deals from CSROI and return those below max_ratio."""
    raw_deals = fetch_deals()
    rate = fetch_exchange_rate()

    deals: list[Deal] = []
    for item in raw_deals:
        if item.ratio > max_ratio:
            continue
        deals.append(Deal(
            name=item.name,
            csf_price_usd=item.csf_price_usd,
            csroi_steam_price_usd=item.steam_price_usd,
            csf_price_eur=item.csf_price_usd * rate,
            csroi_steam_price_eur=item.steam_price_usd * rate,
            csroi_ratio=item.ratio,
            multiplier=compute_multiplier(item.steam_price_usd, item.csf_price_usd),
        ))

    deals.sort(key=lambda d: d.csroi_ratio)
    return deals


def verify_deals(
    deals: list[Deal],
    max_items: int | None = None,
) -> list[Deal]:
    """Verify deal prices against Steam priceoverview."""
    to_verify = deals[:max_items] if max_items else deals

    for deal in to_verify:
        try:
            result = fetch_price_overview(deal.name)
            deal.steam_price = result
            deal.liquidity = _liquidity_label(result.volume_24h)
            deal.verified = True

            if result.lowest_price_eur is not None:
                steam_net = result.lowest_price_eur / STEAM_FEE_DIVISOR
                deal.multiplier = steam_net / (deal.csf_price_eur * 1.028) if deal.csf_price_eur > 0 else 0.0
        except Exception:
            pass

    return deals
