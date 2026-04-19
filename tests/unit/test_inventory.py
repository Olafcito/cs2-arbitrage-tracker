"""Unit tests for src/services/inventory.py — all HTTP mocked, no network calls."""

import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest
import requests

import src.services.inventory as inv_svc
from src.models.inventory import InventoryItem, InventorySnapshot
from src.services.inventory import fetch_inventory, get_snapshot


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _item_dict(**overrides) -> dict:
    base = {
        "assetid": "12345",
        "markethashname": "AK-47 | Redline (Field-Tested)",
        "image": "https://cdn.example.com/ak47.png",
        "float": 0.234,
        "rarity": "Classified",
        "tradeable": True,
        "tradable_date": None,
        "acquired_at": "2026-04-01",
        "pricelatest": 15.5,
        "pricemix": 14.2,
        "buyorderprice": 12.0,
        "stickers": [],
        "keychains": [],
    }
    base.update(overrides)
    return base


def _mock_response(items: list[dict], status: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status
    resp.json.return_value = items
    resp.raise_for_status = MagicMock()
    return resp


# ---------------------------------------------------------------------------
# InventoryItem model
# ---------------------------------------------------------------------------

class TestInventoryItem:
    def test_float_field_alias(self):
        item = InventoryItem.model_validate(_item_dict())
        assert item.float_value == pytest.approx(0.234, abs=0.001)

    def test_missing_optional_fields_default_none(self):
        item = InventoryItem.model_validate({"assetid": "1", "markethashname": "Item"})
        assert item.float_value is None
        assert item.rarity is None
        assert item.image is None
        assert item.pricelatest is None

    def test_tradeable_defaults_false(self):
        item = InventoryItem.model_validate({"assetid": "1", "markethashname": "Item"})
        assert item.tradeable is False

    def test_stickers_default_empty(self):
        item = InventoryItem.model_validate({"assetid": "1", "markethashname": "Item"})
        assert item.stickers == []

    def test_full_item_round_trips(self):
        raw = _item_dict()
        item = InventoryItem.model_validate(raw)
        assert item.assetid == "12345"
        assert item.markethashname == "AK-47 | Redline (Field-Tested)"
        assert item.rarity == "Classified"
        assert item.acquired_at == "2026-04-01"


# ---------------------------------------------------------------------------
# get_snapshot
# ---------------------------------------------------------------------------

class TestGetSnapshot:
    def test_returns_none_when_no_file(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        assert get_snapshot() is None

    def test_loads_snapshot_from_file(self, tmp_path, mocker):
        cache = tmp_path / "inventory.json"
        snapshot = InventorySnapshot(
            fetched_at=datetime(2026, 4, 19, tzinfo=timezone.utc),
            steam_id="76561198023394152",
            item_count=1,
            items=[InventoryItem.model_validate(_item_dict())],
        )
        cache.write_text(
            json.dumps(snapshot.model_dump(), default=str),
            encoding="utf-8",
        )
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        result = get_snapshot()
        assert result is not None
        assert result.item_count == 1
        assert result.items[0].markethashname == "AK-47 | Redline (Field-Tested)"

    def test_steam_id_preserved(self, tmp_path, mocker):
        cache = tmp_path / "inventory.json"
        snapshot = InventorySnapshot(
            fetched_at=datetime(2026, 4, 19, tzinfo=timezone.utc),
            steam_id="76561198023394152",
            item_count=0,
            items=[],
        )
        cache.write_text(json.dumps(snapshot.model_dump(), default=str), encoding="utf-8")
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        result = get_snapshot()
        assert result.steam_id == "76561198023394152"


# ---------------------------------------------------------------------------
# fetch_inventory
# ---------------------------------------------------------------------------

class TestFetchInventory:
    def test_raises_if_no_api_key(self, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        with pytest.raises(ValueError, match="steamwebapi_key"):
            fetch_inventory()

    def test_raises_if_no_steam_id(self, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "")
        with pytest.raises(ValueError, match="steam_id"):
            fetch_inventory()

    def test_steam_id_arg_overrides_env(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "env-id")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mock_get = mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict()]),
        )
        result = fetch_inventory(steam_id="override-id")
        assert mock_get.call_args.kwargs["params"]["steam_id"] == "override-id"
        assert result.steam_id == "override-id"

    def test_returns_snapshot_with_correct_item_count(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict(), _item_dict(assetid="99999")]),
        )
        result = fetch_inventory()
        assert result.item_count == 2
        assert len(result.items) == 2

    def test_items_persisted_to_cache(self, tmp_path, mocker):
        cache = tmp_path / "inventory.json"
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict()]),
        )
        fetch_inventory()
        assert cache.exists()
        saved = json.loads(cache.read_text(encoding="utf-8"))
        assert saved["item_count"] == 1
        assert saved["items"][0]["markethashname"] == "AK-47 | Redline (Field-Tested)"

    def test_correct_url_called(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "my-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mock_get = mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([]),
        )
        fetch_inventory()
        call_url = mock_get.call_args.args[0]
        assert "inventory" in call_url
        assert mock_get.call_args.kwargs["params"]["key"] == "my-key"
        assert mock_get.call_args.kwargs["params"]["steam_id"] == "76561198023394152"

    def test_http_error_propagates(self, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("429 Too Many Requests")
        mocker.patch("src.services.inventory.requests.get", return_value=resp)
        with pytest.raises(requests.HTTPError):
            fetch_inventory()

    def test_empty_inventory_saved(self, tmp_path, mocker):
        cache = tmp_path / "inventory.json"
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([]),
        )
        result = fetch_inventory()
        assert result.item_count == 0
        assert result.items == []

    def test_float_value_parsed_from_alias(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict(**{"float": 0.182})]),
        )
        result = fetch_inventory()
        assert result.items[0].float_value == pytest.approx(0.182, abs=0.001)

    def test_fetched_at_is_recent(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([]),
        )
        before = datetime.now(timezone.utc)
        result = fetch_inventory()
        after = datetime.now(timezone.utc)
        assert before <= result.fetched_at <= after


# ---------------------------------------------------------------------------
# Integration test — opt-in only, burns monthly rate limit
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_integration_fetch_real_inventory():
    """Fetch real inventory. Requires INVENTORY_INTEGRATION=1 and valid .env keys.

    WARNING: Consumes one monthly API call (free tier: 5/month).
    """
    import os
    if not os.getenv("INVENTORY_INTEGRATION"):
        pytest.skip("Set INVENTORY_INTEGRATION=1 to run (burns monthly rate limit)")
    snapshot = fetch_inventory()
    assert snapshot.item_count >= 0
    assert snapshot.steam_id != ""
    print(f"\nFetched {snapshot.item_count} items for {snapshot.steam_id}")
    if snapshot.items:
        first = snapshot.items[0]
        print(f"First item: {first.markethashname} | float={first.float_value} | rarity={first.rarity}")
