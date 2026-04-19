"""Unit tests for src/services/csfloat.py — all HTTP mocked, no network calls."""

from unittest.mock import MagicMock

import pytest
import requests

import src.services.csfloat as csfloat_svc
from src.services.csfloat import fetch_listings, fetch_lowest_price


def _listing_response(*prices_cents: int) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {
        "data": [{"price": p, "id": f"id-{i}"} for i, p in enumerate(prices_cents)]
    }
    resp.raise_for_status = MagicMock()
    return resp


def _empty_response() -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"data": []}
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# fetch_listings
# ---------------------------------------------------------------------------

class TestFetchListings:
    def test_no_api_key_returns_empty(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "")
        assert fetch_listings("Prisma Case") == []

    def test_returns_raw_listing_dicts(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(199, 250))
        result = fetch_listings("AK-47 | Redline (Field-Tested)", limit=2)
        assert len(result) == 2
        assert result[0]["price"] == 199

    def test_category_param_forwarded(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_listings("AK-47 | Redline (Field-Tested)", category=2)
        assert mock_get.call_args.kwargs["params"]["category"] == 2

    def test_listing_type_param_forwarded(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_listings("Item", listing_type="buy_now")
        assert mock_get.call_args.kwargs["params"]["type"] == "buy_now"

    def test_sort_by_param_forwarded(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_listings("Item", sort_by="highest_price")
        assert mock_get.call_args.kwargs["params"]["sort_by"] == "highest_price"

    def test_limit_capped_at_50(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_empty_response())
        fetch_listings("Item", limit=999)
        assert mock_get.call_args.kwargs["params"]["limit"] == 50

    def test_missing_data_key_returns_empty(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        resp = MagicMock()
        resp.json.return_value = {}
        resp.raise_for_status = MagicMock()
        mocker.patch("src.services.csfloat.requests.get", return_value=resp)
        assert fetch_listings("Item") == []

    def test_http_error_propagates(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("403 Forbidden")
        mocker.patch("src.services.csfloat.requests.get", return_value=resp)
        with pytest.raises(requests.HTTPError):
            fetch_listings("Item")

    def test_float_range_params_forwarded(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_empty_response())
        fetch_listings("Item", min_float=0.1, max_float=0.3)
        params = mock_get.call_args.kwargs["params"]
        assert params["min_float"] == 0.1
        assert params["max_float"] == 0.3

    def test_optional_params_omitted_when_none(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_empty_response())
        fetch_listings("Item", category=None, listing_type=None, min_float=None, max_float=None)
        params = mock_get.call_args.kwargs["params"]
        assert "category" not in params
        assert "type" not in params
        assert "min_float" not in params
        assert "max_float" not in params


# ---------------------------------------------------------------------------
# fetch_lowest_price
# ---------------------------------------------------------------------------

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

    def test_defaults_to_lowest_price_buy_now(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_lowest_price("Glock-18 | Fade")
        params = mock_get.call_args.kwargs["params"]
        assert params["sort_by"] == "lowest_price"
        assert params["type"] == "buy_now"
        assert params["limit"] == 1

    def test_price_discount_applied(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(200))
        result = fetch_lowest_price("Item", price_discount=0.98)
        assert result == pytest.approx(1.96)

    def test_price_discount_default_is_1(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(200))
        assert fetch_lowest_price("Item") == pytest.approx(2.00)

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

    def test_category_forwarded(self, mocker):
        mocker.patch.object(csfloat_svc, "CSFLOAT_API_KEY", "test-key")
        mock_get = mocker.patch("src.services.csfloat.requests.get", return_value=_listing_response(100))
        fetch_lowest_price("AK-47 | Redline (Field-Tested)", category=2)
        assert mock_get.call_args.kwargs["params"]["category"] == 2
