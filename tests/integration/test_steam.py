"""Integration tests for src/services/steam.py — hits the real Steam API.

Run with: uv run pytest tests/integration/test_steam.py -v
"""

import pytest

from src.models.steam import SteamPrice
from src.services import steam as steam_svc


class TestSteamIntegration:
    def setup_method(self):
        steam_svc._request_times.clear()

    def test_known_item_returns_prices(self):
        result = steam_svc.fetch_price_overview("Prisma Case")
        assert isinstance(result, SteamPrice)
        assert result.lowest_price_eur is not None
        assert result.lowest_price_eur > 0

    def test_rate_limit_status_after_call(self):
        steam_svc.fetch_price_overview("Prisma Case")
        status = steam_svc.get_rate_limit_status()
        assert status["requests_in_window"] >= 1
