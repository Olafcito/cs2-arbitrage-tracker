"""Unit and integration tests for src/services/steam.py."""

from __future__ import annotations

import json
import time
from collections import deque
from unittest.mock import MagicMock, patch

import pytest
import requests

from src.models.steam import SteamPrice
from src.services import steam as steam_svc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(data: dict, content_type: str = "application/json") -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.headers = {"content-type": content_type}
    resp.json.return_value = data
    resp.text = json.dumps(data)
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Unit tests — _parse_steam_price
# ---------------------------------------------------------------------------

class TestParseSteamPrice:
    def test_eur_suffix(self):
        assert steam_svc._parse_steam_price("1,23EUR") == pytest.approx(1.23)

    def test_eur_prefix(self):
        assert steam_svc._parse_steam_price("EUR1.23") == pytest.approx(1.23)

    def test_plain_number(self):
        assert steam_svc._parse_steam_price("0.99") == pytest.approx(0.99)

    def test_none_input(self):
        assert steam_svc._parse_steam_price(None) is None

    def test_empty_string(self):
        assert steam_svc._parse_steam_price("") is None

    def test_no_number(self):
        assert steam_svc._parse_steam_price("N/A") is None

    def test_large_price(self):
        # Steam EUR uses comma as decimal separator — "1234,56 EUR" = €1234.56
        assert steam_svc._parse_steam_price("1234,56 EUR") == pytest.approx(1234.56)


# ---------------------------------------------------------------------------
# Unit tests — get_rate_limit_status
# ---------------------------------------------------------------------------

class TestGetRateLimitStatus:
    def setup_method(self):
        steam_svc._request_times.clear()

    def test_empty_deque_no_retry(self):
        status = steam_svc.get_rate_limit_status()
        assert status["requests_in_window"] == 0
        assert status["retry_after_seconds"] is None

    def test_partial_window(self):
        now = time.time()
        for _ in range(10):
            steam_svc._request_times.append(now)
        status = steam_svc.get_rate_limit_status()
        assert status["requests_in_window"] == 10
        assert status["capacity"] == steam_svc.MAX_REQUESTS_PER_MINUTE
        assert status["retry_after_seconds"] is None

    def test_full_window_has_retry(self):
        now = time.time()
        for _ in range(steam_svc.MAX_REQUESTS_PER_MINUTE):
            steam_svc._request_times.append(now)
        status = steam_svc.get_rate_limit_status()
        assert status["requests_in_window"] == steam_svc.MAX_REQUESTS_PER_MINUTE
        assert status["retry_after_seconds"] is not None
        assert status["retry_after_seconds"] > 0

    def test_old_requests_not_counted(self):
        old = time.time() - 120
        for _ in range(steam_svc.MAX_REQUESTS_PER_MINUTE):
            steam_svc._request_times.append(old)
        status = steam_svc.get_rate_limit_status()
        assert status["requests_in_window"] == 0
        assert status["retry_after_seconds"] is None


# ---------------------------------------------------------------------------
# Unit tests — fetch_price_overview (mocked HTTP)
# ---------------------------------------------------------------------------

class TestFetchPriceOverview:
    def setup_method(self):
        steam_svc._request_times.clear()

    def test_returns_steam_price_model(self, mocker):
        resp = _make_response({
            "lowest_price": "EUR1.23",
            "median_price": "EUR1.50",
            "volume": "1,234",
        })
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        result = steam_svc.fetch_price_overview("Prisma Case")
        assert isinstance(result, SteamPrice)
        assert result.lowest_price_eur == pytest.approx(1.23, abs=0.01)
        assert result.median_price_eur == pytest.approx(1.50, abs=0.01)
        assert result.volume_24h == 1234

    def test_missing_optional_fields(self, mocker):
        resp = _make_response({"lowest_price": "EUR0.50"})
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        result = steam_svc.fetch_price_overview("Some Case")
        assert result.lowest_price_eur == pytest.approx(0.50, abs=0.01)
        assert result.median_price_eur is None
        assert result.volume_24h is None

    def test_html_response_raises_rate_limit_error(self, mocker):
        resp = MagicMock()
        resp.status_code = 200
        resp.headers = {"content-type": "text/html; charset=utf-8"}
        resp.text = "<html><body>Too Many Requests</body></html>"
        resp.raise_for_status = MagicMock()
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        with pytest.raises(steam_svc.SteamRateLimitError):
            steam_svc.fetch_price_overview("Prisma Case")

    def test_html_body_without_content_type_raises(self, mocker):
        resp = MagicMock()
        resp.status_code = 200
        resp.headers = {"content-type": "application/json"}
        resp.text = "<html>throttled</html>"
        resp.raise_for_status = MagicMock()
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        with pytest.raises(steam_svc.SteamRateLimitError):
            steam_svc.fetch_price_overview("Prisma Case")

    def test_http_error_propagates(self, mocker):
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("404")
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        with pytest.raises(requests.HTTPError):
            steam_svc.fetch_price_overview("Unknown Item")

    def test_records_request_time(self, mocker):
        resp = _make_response({"lowest_price": "EUR1.00"})
        mocker.patch("src.services.steam.requests.get", return_value=resp)
        before = len(steam_svc._request_times)
        steam_svc.fetch_price_overview("Test Item")
        assert len(steam_svc._request_times) == before + 1


# ---------------------------------------------------------------------------
# Integration tests — real HTTP (skipped unless STEAM_INTEGRATION=1)
# ---------------------------------------------------------------------------

pytestmark_integration = pytest.mark.skipif(
    __import__("os").getenv("STEAM_INTEGRATION") != "1",
    reason="Set STEAM_INTEGRATION=1 to run real Steam API calls",
)


@pytestmark_integration
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
