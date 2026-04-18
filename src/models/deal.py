"""Domain model for CSFloat arbitrage deals."""

from __future__ import annotations

from src.models.base import ArbitrageBase
from src.models.steam import SteamPrice


class Deal(ArbitrageBase):
    """An item-level arbitrage opportunity from CSFloat's marketRatios."""

    name: str
    csf_price_usd: float
    csroi_steam_price_usd: float
    csf_price_eur: float = 0.0
    csroi_steam_price_eur: float = 0.0
    csroi_ratio: float
    multiplier: float
    steam_price: SteamPrice | None = None
    liquidity: str = "unknown"
    verified: bool = False
