"""Reusable Steam Market price sub-model."""

from __future__ import annotations

from src.models.base import ArbitrageBase


class SteamPrice(ArbitrageBase):
    """Steam Market price data — reusable across Deal, ArbitrageItem, and lookup."""

    lowest_price_eur: float | None = None
    median_price_eur: float | None = None
    volume_24h: int | None = None
