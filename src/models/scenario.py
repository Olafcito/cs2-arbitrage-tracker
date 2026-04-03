"""Domain models for buy-order scenarios."""

from __future__ import annotations

from pydantic import BaseModel, Field

from src.models.base import ArbitrageBase


class ScenarioAllocation(BaseModel):
    """One item in a buy scenario input."""

    name: str
    pct: float = Field(ge=0, le=1)


class ScenarioInput(BaseModel):
    """Request body for POST /scenarios."""

    budget_eur: float
    allocations: list[ScenarioAllocation]
    label: str = ""


class ScenarioItem(ArbitrageBase):
    """Computed result for one allocation line."""

    name: str
    pct: float
    budget_alloc_eur: float
    csf_price_eur: float
    steam_price_eur: float
    quantity: int
    csf_spend_eur: float
    spend_with_fee_eur: float
    steam_proceeds_eur: float
    keys_raw: float


class ScenarioResult(ArbitrageBase):
    """Full scenario output."""

    label: str
    budget_eur: float
    items: list[ScenarioItem]
    total_quantity: int
    total_csf_spend_eur: float
    total_spend_with_fee_eur: float
    total_steam_proceeds_eur: float
    keys_raw: float
    keys_final: int
    leftover_steam_eur: float


class ScenarioSummary(BaseModel):
    """Lightweight summary for listing saved scenarios."""

    filename: str
    label: str
    saved_at: str
    executed: bool
    budget_eur: float
    keys_final: int


class SavedScenario(BaseModel):
    """Full saved scenario file structure."""

    saved_at: str
    executed: bool
    result: ScenarioResult
