"""Domain models for Steam inventory snapshots."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from src.models.base import ArbitrageBase


class InventoryItem(ArbitrageBase):
    assetid: str
    markethashname: str
    image: str | None = None

    # Wear / quality
    float_value: float | None = Field(None, alias="float")
    rarity: str | None = None
    phase: str | None = None

    # Trade status
    tradeable: bool = False
    tradable_date: str | None = None

    # Timestamps
    acquired_at: str | None = None

    # Pricing (USD, from Steam Market)
    pricelatest: float | None = None
    pricemix: float | None = None
    buyorderprice: float | None = None

    stickers: list[Any] = Field(default_factory=list)
    keychains: list[Any] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class InventorySnapshot(BaseModel):
    fetched_at: datetime
    steam_id: str
    item_count: int
    items: list[InventoryItem]
