"""Typed models for CSROI API responses — only the fields we use."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CsroiCase(BaseModel):
    """One case/collection from allTrackedCases.json."""

    name: str = Field(validation_alias="Name")
    collection_id: int = Field(validation_alias="CollectionId")
    collection_type: str = Field(validation_alias="CollectionType")
    drop_type: str = Field(validation_alias="DropType")
    num_listings: int = Field(validation_alias="NumListings")
    csf_price_usd: float = Field(validation_alias="CollectionPriceCSFloat")
    steam_price_usd: float = Field(validation_alias="CollectionPriceSteam")
    roi_csroi: float = Field(validation_alias="CSFloatROI")
    profit_prob: float = Field(validation_alias="ProfitCSFloat")

    model_config = ConfigDict(populate_by_name=True)


class CsroiDealItem(BaseModel):
    """One item from marketRatios → csfloat → ratios."""

    name: str = Field(validation_alias="item")
    csf_price_usd: float = Field(validation_alias="price")
    steam_price_usd: float = Field(validation_alias="steam_price")
    ratio: float

    model_config = ConfigDict(populate_by_name=True)
