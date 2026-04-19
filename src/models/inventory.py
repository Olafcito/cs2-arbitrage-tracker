"""Domain models for Steam inventory snapshots."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FloatInfo(BaseModel):
    floatvalue: float | None = None
    paintseed: int | None = None
    paintindex: int | None = None
    phase: str | None = None
    isstattrak: bool = False
    issouvenir: bool = False
    stickers: list[Any] | None = None
    keychains: list[Any] | None = None


class SteamTimestamp(BaseModel):
    date: str  # "2026-01-22 06:32:25.000000"
    timezone: str = "UTC"


class InventoryItem(BaseModel):
    id: str
    assetid: str
    markethashname: str
    image: str | None = None

    # Pricing (USD)
    pricelatest: float | None = None
    pricemix: float | None = None
    pricereal: float | None = None       # third-party market price
    buyorderprice: float | None = None
    pricemedian: float | None = None

    # Market volume
    sold7d: int | None = None
    sold30d: int | None = None
    offervolume: int | None = None

    # Wear / quality
    float_info: FloatInfo | None = Field(None, alias="float")
    rarity: str | None = None
    color: str | None = None             # hex rarity colour, e.g. "b0c3d9"
    quality: str | None = None
    wear: str | None = None              # abbreviated: fn/mw/ft/ww/bs

    # Identity
    isstattrak: bool = False
    issouvenir: bool = False

    # Trade status
    tradable: bool = False
    tradelocked: bool = False
    markettradablerestriction: int = 0   # days until tradeable
    marketable: bool = False

    # Timestamps
    createdat: SteamTimestamp | None = None
    firstseenat: str | None = None       # ISO datetime — closest to "acquired at"

    model_config = {"populate_by_name": True}

    @property
    def float_value(self) -> float | None:
        return self.float_info.floatvalue if self.float_info else None

    @property
    def phase(self) -> str | None:
        return self.float_info.phase if self.float_info else None


class InventorySnapshot(BaseModel):
    fetched_at: datetime
    steam_id: str
    item_count: int
    items: list[InventoryItem]


class InventoryUsage(BaseModel):
    month: str                  # "2026-04"
    syncs_this_month: int
    syncs_remaining: int
    monthly_limit: int = 5
    last_sync_at: str | None = None


class InventoryResponse(BaseModel):
    snapshot: InventorySnapshot | None
    usage: InventoryUsage
