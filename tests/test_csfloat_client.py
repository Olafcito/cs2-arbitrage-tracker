"""Unit and integration tests for src/services/csfloat.py."""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest
import requests

import src.services.csfloat as csfloat_svc
from src.services.csfloat import fetch_lowest_price


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _listing_response(price_cents: int) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": [{"price": price_cents, "id": "abc123"}]}
    resp.raise_for_status = MagicMock()
    return resp


def _empty_response() -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": []}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# Unit tests — fetch_lowest_price
# ---------------------------------------------------------------------------

class TestFetchLowestPrice:
    def test_no_api_key_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "")
        result = fetch_lowest_price("Prisma Case")
        assert result is None

    def test_price_converted_from_cents(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(199))
        result = fetch_lowest_price("Prisma Case")
        assert result == pytest.approx(1.99)

    def test_empty_listings_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_empty_response())
        result = fetch_lowest_price("Very Rare Item")
        assert result is None

    def test_correct_headers_sent(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "my-secret-key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(500))
        fetch_lowest_price("AK-47 | Redline")
        call_kwargs = mock_get.call_args
        assert call_kwargs.kwargs["headers"]["Authorization"] == "my-secret-key"

    def test_correct_params_sent(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_lowest_price("Glock-18 | Fade")
        params = mock_get.call_args.kwargs["params"]
        assert params["market_hash_name"] == "Glock-18 | Fade"
        assert params["sort_by"] == "lowest_price"
        assert params["limit"] == 1

    def test_http_error_propagates(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("403 Forbidden")
        mocker.patch("src.services.csfloat.requests.get", return_value=resp)
        with pytest.raises(requests.HTTPError):
            fetch_lowest_price("Any Item")

    def test_large_price(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(123456))
        result = fetch_lowest_price("Dragon Lore")
        assert result == pytest.approx(1234.56)

    def test_zero_price(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(0))
        result = fetch_lowest_price("Some Item")
        assert result == pytest.approx(0.0)

    def test_missing_data_key_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {}
        resp.raise_for_status = MagicMock()
        mocker.patch("src.services.csfloat.requests.get", return_value=resp)
        result = fetch_lowest_price("Any Item")
        assert result is None


# ---------------------------------------------------------------------------
# Integration tests — real HTTP (skipped unless CSFLOAT_INTEGRATION=1)
# ---------------------------------------------------------------------------

pytestmark_integration = pytest.mark.skipif(
    os.getenv("CSFLOAT_INTEGRATION") != "1",
    reason="Set CSFLOAT_INTEGRATION=1 and CSFLOAT_API_KEY to run real CSFloat API calls",
)


@pytestmark_integration
class TestCSFloatIntegration:
    def test_known_item_returns_price(self):
        result = fetch_lowest_price("Prisma Case")
        # Prisma Case is a high-volume item — should always have listings
        assert result is not None
        assert result > 0
        assert result < 10_000  # sanity: not a million dollars

    def test_item_with_special_chars(self):
        result = fetch_lowest_price("AK-47 | Redline (Field-Tested)")
        assert result is None or result > 0

    def test_nonexistent_item_returns_none(self):
        result = fetch_lowest_price("ZZZZZ_THIS_DOES_NOT_EXIST_12345")
        assert result is None
