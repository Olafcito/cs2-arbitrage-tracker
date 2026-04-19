"""Domain models for case opening sessions."""

from __future__ import annotations

import datetime as dt
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from src.models.base import ArbitrageBase

ItemStatus = Literal["opened", "for_sale", "delisted", "sold"]
ItemMarketplace = Literal["steam", "csfloat"]


class StatusEvent(ArbitrageBase):
    status: ItemStatus
    marketplace: ItemMarketplace | None = None
    changed_at: datetime


class CaseOpeningItem(ArbitrageBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    wear: str
    float_value: float | None = None

    # Prices — populated on sync
    csf_price_eur: float | None = None
    csf_realized_eur: float | None = None   # csf_price * 0.98 (seller fee)
    steam_price_eur: float | None = None
    item_multiplier: float | None = None    # steam_net / csf_realized

    stattrak: bool = False
    rarity: int | None = None
    icon_url: str | None = None

    # Status lifecycle
    status: ItemStatus = "opened"
    marketplace: ItemMarketplace | None = None
    status_updated_at: datetime = Field(default_factory=lambda: datetime.now(dt.timezone.utc))
    status_history: list[StatusEvent] = Field(default_factory=list)

    created_at: datetime | None = None
    last_synced_at: datetime | None = None


class CaseOpening(ArbitrageBase):
    id: str
    name: str
    date: date
    unbox_price: float
    multiplier: float = 1.0
    items: list[CaseOpeningItem] = []
    created_at: datetime
    last_event_at: datetime

    # Computed on read
    csf_roi: float | None = None
    steam_roi: float | None = None
    csf_roi_multiplied: float | None = None
    total_csf_value: float | None = None
    total_steam_net: float | None = None


class CaseOpeningSummary(ArbitrageBase):
    id: str
    name: str
    date: date
    item_count: int
    unbox_price: float
    multiplier: float
    csf_roi: float | None = None
    steam_roi: float | None = None
    last_event_at: datetime


class CaseOpeningCreate(BaseModel):
    name: str
    date: dt.date
    unbox_price: float
    multiplier: float = 1.0


class CaseOpeningPatch(BaseModel):
    name: str | None = None
    date: dt.date | None = None
    unbox_price: float | None = None
    multiplier: float | None = None


class CaseOpeningItemInput(BaseModel):
    name: str
    wear: str
    float_value: float | None = None
    stattrak: bool = False


class CaseOpeningItemStatusPatch(BaseModel):
    status: ItemStatus
    marketplace: ItemMarketplace | None = None


class CaseOpeningItemPatch(BaseModel):
    name: str | None = None
    wear: str | None = None
    float_value: float | None = None
    stattrak: bool | None = None
