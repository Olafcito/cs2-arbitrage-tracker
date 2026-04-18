"""Domain models for case opening sessions."""

from __future__ import annotations

import datetime as dt
from datetime import date, datetime

from pydantic import BaseModel

from src.models.base import ArbitrageBase


class CaseOpeningItem(ArbitrageBase):
    name: str
    wear: str
    float_value: float | None = None
    csf_price_eur: float | None = None
    steam_price_eur: float | None = None
    last_synced_at: datetime | None = None


class CaseOpening(ArbitrageBase):
    id: str
    name: str
    date: date
    unbox_price: float
    multiplier: float = 1.0
    items: list[CaseOpeningItem] = []
    created_at: datetime

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
