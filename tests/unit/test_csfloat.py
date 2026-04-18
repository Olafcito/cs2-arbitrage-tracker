"""Unit tests for src/services/csfloat.py — all HTTP mocked, no network calls."""

from unittest.mock import MagicMock

import pytest
import requests

import src.services.csfloat as csfloat_svc
from src.services.csfloat import fetch_lowest_price


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


class TestFetchLowestPrice:
    def test_no_api_key_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "")
        assert fetch_lowest_price("Prisma Case") is None

    def test_price_converted_from_cents(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(199))
        assert fetch_lowest_price("Prisma Case") == pytest.approx(1.99)

    def test_empty_listings_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_empty_response())
        assert fetch_lowest_price("Very Rare Item") is None

    def test_correct_headers_sent(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "my-secret-key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(500))
        fetch_lowest_price("AK-47 | Redline")
        assert mock_get.call_args.kwargs["headers"]["Authorization"] == "my-secret-key"

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
        assert fetch_lowest_price("Dragon Lore") == pytest.approx(1234.56)

    def test_zero_price(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(0))
        assert fetch_lowest_price("Some Item") == pytest.approx(0.0)

    def test_missing_data_key_returns_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {}
        resp.raise_for_status = MagicMock()
        mocker.patch("src.services.csfloat.requests.get", return_value=resp)
        assert fetch_lowest_price("Any Item") is None
