"""Integration tests for src/services/csfloat.py — hits the real CSFloat API.

Run with: uv run pytest tests/integration/test_csfloat.py -v
Requires CSFLOAT_API_KEY set in .env or environment.
"""

import pytest

from src.services.csfloat import fetch_lowest_price


class TestCSFloatIntegration:
    def test_known_item_returns_price(self):
        result = fetch_lowest_price("Prisma Case")
        assert result is not None
        assert result > 0
        assert result < 10_000

    def test_item_with_special_chars(self):
        result = fetch_lowest_price("AK-47 | Redline (Field-Tested)")
        assert result is None or result > 0

    def test_nonexistent_item_returns_none(self):
        result = fetch_lowest_price("ZZZZZ_THIS_DOES_NOT_EXIST_12345")
        assert result is None
