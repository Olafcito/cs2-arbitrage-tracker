"""Unit tests for src/services/inventory.py — all HTTP mocked, no network calls."""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
import requests

import src.services.inventory as inv_svc
from src.models.inventory import FloatInfo, InventoryItem, InventorySnapshot
from src.services.inventory import fetch_inventory, get_inventory_response, get_snapshot


# ---------------------------------------------------------------------------
# Helpers — realistic item fixture matching actual API shape
# ---------------------------------------------------------------------------

def _item_dict(**overrides) -> dict:
    base = {
        "id": "abc123",
        "assetid": "51148623953",
        "markethashname": "AK-47 | Redline (Field-Tested)",
        "image": "https://community.akamai.steamstatic.com/economy/image/abc",
        "float": {
            "floatvalue": 0.3717089891433716,
            "paintseed": 708,
            "paintindex": 7,
            "phase": None,
            "isstattrak": False,
            "issouvenir": False,
            "stickers": None,
            "keychains": None,
        },
        "rarity": "Classified",
        "color": "d32ce6",
        "quality": "Normal",
        "wear": "ft",
        "isstattrak": False,
        "issouvenir": False,
        "tradable": True,
        "tradelocked": False,
        "markettradablerestriction": 0,
        "marketable": True,
        "firstseenat": "2026-01-15T00:00:00+00:00",
        "createdat": {"date": "2026-01-22 06:32:25.000000", "timezone_type": 3, "timezone": "UTC"},
        "pricelatest": 15.5,
        "pricemix": 14.2,
        "pricereal": 13.0,
        "buyorderprice": 12.0,
        "pricemedian": 15.0,
        "sold7d": 45,
        "sold30d": 180,
        "offervolume": 320,
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
    def test_float_extracted_from_nested_object(self):
        item = InventoryItem.model_validate(_item_dict())
        assert item.float_value == pytest.approx(0.3717, abs=0.001)

    def test_phase_extracted_from_nested_object(self):
        item = InventoryItem.model_validate(_item_dict(**{"float": {"floatvalue": 0.1, "phase": "Ruby"}}))
        assert item.phase == "Ruby"

    def test_phase_none_when_not_set(self):
        item = InventoryItem.model_validate(_item_dict())
        assert item.phase is None

    def test_float_none_when_float_field_absent(self):
        d = _item_dict()
        d.pop("float")
        item = InventoryItem.model_validate(d)
        assert item.float_value is None

    def test_color_field_preserved(self):
        item = InventoryItem.model_validate(_item_dict())
        assert item.color == "d32ce6"

    def test_tradable_field_correct(self):
        item = InventoryItem.model_validate(_item_dict(tradable=True))
        assert item.tradable is True

    def test_tradelocked_field(self):
        item = InventoryItem.model_validate(_item_dict(tradelocked=True, markettradablerestriction=7))
        assert item.tradelocked is True
        assert item.markettradablerestriction == 7

    def test_isstattrak_from_top_level(self):
        item = InventoryItem.model_validate(_item_dict(isstattrak=True))
        assert item.isstattrak is True

    def test_firstseenat_preserved(self):
        item = InventoryItem.model_validate(_item_dict())
        assert item.firstseenat == "2026-01-15T00:00:00+00:00"

    def test_missing_optional_fields_default_none(self):
        item = InventoryItem.model_validate({"id": "x", "assetid": "1", "markethashname": "Item"})
        assert item.float_value is None
        assert item.rarity is None
        assert item.image is None
        assert item.pricelatest is None
        assert item.color is None

    def test_full_item_round_trips(self):
        raw = _item_dict()
        item = InventoryItem.model_validate(raw)
        assert item.assetid == "51148623953"
        assert item.markethashname == "AK-47 | Redline (Field-Tested)"
        assert item.rarity == "Classified"
        assert item.sold7d == 45


# ---------------------------------------------------------------------------
# Usage tracking
# ---------------------------------------------------------------------------

class TestUsageTracking:
    def test_new_month_starts_at_zero(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        usage = inv_svc._load_usage()
        assert usage.syncs_this_month == 0
        assert usage.syncs_remaining == inv_svc._MONTHLY_LIMIT

    def test_usage_persisted_after_increment(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        inv_svc._increment_usage()
        usage = inv_svc._load_usage()
        assert usage.syncs_this_month == 1
        assert usage.syncs_remaining == inv_svc._MONTHLY_LIMIT - 1

    def test_old_month_resets_counter(self, tmp_path, mocker):
        usage_file = tmp_path / "usage.json"
        usage_file.write_text(
            json.dumps({"month": "2025-01", "syncs_this_month": 4, "syncs_remaining": 1,
                        "monthly_limit": 5, "last_sync_at": None}),
            encoding="utf-8",
        )
        mocker.patch.object(inv_svc, "_USAGE_FILE", usage_file)
        usage = inv_svc._load_usage()
        assert usage.syncs_this_month == 0
        assert usage.syncs_remaining == 5

    def test_remaining_never_goes_below_zero(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        for _ in range(inv_svc._MONTHLY_LIMIT + 2):
            inv_svc._increment_usage()
        usage = inv_svc._load_usage()
        assert usage.syncs_remaining == 0


# ---------------------------------------------------------------------------
# get_snapshot / get_inventory_response
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
        cache.write_text(json.dumps(snapshot.model_dump(), default=str), encoding="utf-8")
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        result = get_snapshot()
        assert result is not None
        assert result.item_count == 1

    def test_get_inventory_response_includes_usage(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        result = get_inventory_response()
        assert result.snapshot is None
        assert result.usage.syncs_this_month == 0


# ---------------------------------------------------------------------------
# fetch_inventory
# ---------------------------------------------------------------------------

class TestFetchInventory:
    def test_raises_if_no_api_key(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        with pytest.raises(ValueError, match="steamwebapi_key"):
            fetch_inventory()

    def test_raises_if_no_steam_id(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        with pytest.raises(ValueError, match="steam_id"):
            fetch_inventory()

    def test_raises_when_monthly_limit_reached(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        usage_file = tmp_path / "usage.json"
        month = inv_svc._current_month()
        usage_file.write_text(
            json.dumps({"month": month, "syncs_this_month": 5, "syncs_remaining": 0,
                        "monthly_limit": 5, "last_sync_at": None}),
            encoding="utf-8",
        )
        mocker.patch.object(inv_svc, "_USAGE_FILE", usage_file)
        with pytest.raises(RuntimeError, match="Monthly inventory limit"):
            fetch_inventory()

    def test_returns_response_with_correct_item_count(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict(), _item_dict(assetid="99999")]),
        )
        result = fetch_inventory()
        assert result.snapshot is not None
        assert result.snapshot.item_count == 2
        assert len(result.snapshot.items) == 2

    def test_usage_incremented_after_fetch(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([]),
        )
        result = fetch_inventory()
        assert result.usage.syncs_this_month == 1
        assert result.usage.syncs_remaining == inv_svc._MONTHLY_LIMIT - 1

    def test_items_persisted_to_cache(self, tmp_path, mocker):
        cache = tmp_path / "inventory.json"
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", cache)
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict()]),
        )
        fetch_inventory()
        assert cache.exists()
        saved = json.loads(cache.read_text(encoding="utf-8"))
        assert saved["item_count"] == 1

    def test_http_error_propagates(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        resp = MagicMock()
        resp.raise_for_status.side_effect = requests.HTTPError("429 Too Many Requests")
        mocker.patch("src.services.inventory.requests.get", return_value=resp)
        with pytest.raises(requests.HTTPError):
            fetch_inventory()

    def test_steam_id_arg_overrides_env(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "env-id")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        mock_get = mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([]),
        )
        result = fetch_inventory(steam_id="override-id")
        assert mock_get.call_args.kwargs["params"]["steam_id"] == "override-id"
        assert result.snapshot.steam_id == "override-id"

    def test_float_nested_object_parsed(self, tmp_path, mocker):
        mocker.patch.object(inv_svc, "STEAMWEBAPI_KEY", "test-key")
        mocker.patch.object(inv_svc, "STEAM_ID", "76561198023394152")
        mocker.patch.object(inv_svc, "_CACHE_FILE", tmp_path / "inventory.json")
        mocker.patch.object(inv_svc, "_USAGE_FILE", tmp_path / "usage.json")
        mocker.patch(
            "src.services.inventory.requests.get",
            return_value=_mock_response([_item_dict()]),
        )
        result = fetch_inventory()
        item = result.snapshot.items[0]
        assert item.float_value == pytest.approx(0.3717, abs=0.001)
        assert item.color == "d32ce6"


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
    result = fetch_inventory()
    assert result.snapshot is not None
    assert result.snapshot.item_count >= 0
    print(f"\nFetched {result.snapshot.item_count} items. {result.usage.syncs_remaining} syncs remaining.")
    if result.snapshot.items:
        first = result.snapshot.items[0]
        print(f"First item: {first.markethashname} | float={first.float_value} | rarity={first.rarity}")
