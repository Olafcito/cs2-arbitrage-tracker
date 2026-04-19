"""Domain models for tracked arbitrage items."""

import urllib.parse
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, computed_field

from src.models.base import ArbitrageBase
from src.models.steam import SteamPrice


# ---------------------------------------------------------------------------
# ItemType — discriminated union: Case or Skin
# ---------------------------------------------------------------------------


class CaseType(ArbitrageBase):
    """Case-specific metadata from CSROI."""

    kind: Literal["case"] = "case"
    collection_id: int
    collection_type: str
    drop_type: str
    num_listings: int
    roi_csroi: float
    profit_prob: float


class SkinType(ArbitrageBase):
    """Skin-specific metadata — minimal for now."""

    kind: Literal["skin"] = "skin"


ItemType = CaseType | SkinType


# ---------------------------------------------------------------------------
# ArbitrageItem — core tracked entity (cases AND skins)
# ---------------------------------------------------------------------------


class ArbitrageItem(ArbitrageBase):
    """A tracked item with computed arbitrage metrics.

    Works for both cases and individual skins. The item_type field
    holds case-specific or skin-specific metadata via composition.
    """

    name: str

    # Prices
    csf_price_usd: float
    steam_price_usd: float
    csf_price_eur: float
    steam_price_eur: float

    # Computed arbitrage
    csf_cost_with_fee_eur: float
    steam_net_eur: float
    multiplier: float
    profit_per_100_eur: float
    steam_balance_per_100_eur: float

    # Composed sub-models
    steam_price: SteamPrice | None = None
    item_type: ItemType | None = None

    # Metadata
    created_at: str | None = None
    updated_at: str
    last_synced_at: datetime | None = None
    price_source: Literal["csroi", "markets"] = "csroi"

    @computed_field
    @property
    def market_hash_name(self) -> str:
        return urllib.parse.quote(self.name)


# ---------------------------------------------------------------------------
# ItemInput — request body for POST /items
# ---------------------------------------------------------------------------


class ItemInput(BaseModel):
    """Request body for adding an item to track."""

    name: str
