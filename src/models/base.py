"""Base model with automatic float rounding for all arbitrage models."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, model_validator


class ArbitrageBase(BaseModel):
    """Inherit from this to automatically round all float fields to 3 decimals.

    Keeps 10.5 as 10.5 and rounds 10.5555 to 10.556.
    """

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def round_all_floats(self) -> ArbitrageBase:
        for field, value in self.__dict__.items():
            if isinstance(value, float):
                setattr(self, field, round(value, 3))
        return self
