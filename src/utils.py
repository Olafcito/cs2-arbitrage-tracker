"""Shared utilities for the CS2 arbitrage tracker."""

from __future__ import annotations

from datetime import datetime, timezone

import requests

from src.config import CSF_DEPOSIT_MULT, FRANKFURTER_URL, STEAM_FEE_DIVISOR
from src.models.item import ArbitrageItem, ItemType
from src.models.steam import SteamPrice


def compute_multiplier(steam_price: float, csf_price: float) -> float:
    """Compute the arbitrage multiplier: (steam / 1.15) / (csf * 1.028).

    Returns 0.0 if csf_price is zero or negative.
    """
    csf_cost = csf_price * CSF_DEPOSIT_MULT
    if csf_cost <= 0:
        return 0.0
    steam_net = steam_price / STEAM_FEE_DIVISOR
    return steam_net / csf_cost


def fetch_exchange_rate() -> float:
    """Fetch current USD to EUR exchange rate from Frankfurter API."""
    resp = requests.get(FRANKFURTER_URL, timeout=10)
    resp.raise_for_status()
    return resp.json()["rates"]["EUR"]


def build_arbitrage_item(
    name: str,
    csf_price_usd: float,
    steam_price_usd: float,
    rate: float,
    item_type: ItemType | None = None,
    steam_price: SteamPrice | None = None,
) -> ArbitrageItem:
    """Build a complete ArbitrageItem from USD prices + exchange rate."""
    csf_eur = csf_price_usd * rate
    steam_eur = steam_price_usd * rate
    csf_cost_with_fee = csf_eur * CSF_DEPOSIT_MULT
    steam_net = steam_eur / STEAM_FEE_DIVISOR
    mult = compute_multiplier(steam_eur, csf_eur)

    return ArbitrageItem(
        name=name,
        csf_price_usd=csf_price_usd,
        steam_price_usd=steam_price_usd,
        csf_price_eur=csf_eur,
        steam_price_eur=steam_eur,
        csf_cost_with_fee_eur=csf_cost_with_fee,
        steam_net_eur=steam_net,
        multiplier=mult,
        profit_per_100_eur=(mult - 1) * 100,
        steam_balance_per_100_eur=mult * 100,
        item_type=item_type,
        steam_price=steam_price,
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
