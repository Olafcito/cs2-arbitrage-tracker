"""Domain models for item groups."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel

from src.models.base import ArbitrageBase


class ItemGroup(ArbitrageBase):
    id: str
    name: str
    item_names: list[str] = []
    created_at: datetime


class GroupInput(BaseModel):
    name: str
    item_names: list[str] = []


class GroupPatch(BaseModel):
    name: str | None = None
    item_names: list[str] | None = None
