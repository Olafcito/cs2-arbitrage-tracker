"""Service: item group CRUD + group sync."""

import json
import time
import uuid
from datetime import datetime, timezone

from src.config import PROJECT_DIR
from src.models.group import GroupInput, GroupPatch, ItemGroup
from src.services import items as items_svc
from src.services.steam import SteamRateLimitError

_GROUPS_FILE = PROJECT_DIR / "data" / "groups.json"


def _load() -> list[ItemGroup]:
    if not _GROUPS_FILE.exists():
        return []
    raw = json.loads(_GROUPS_FILE.read_text(encoding="utf-8"))
    return [ItemGroup.model_validate(g) for g in raw]


def _save(groups: list[ItemGroup]) -> None:
    _GROUPS_FILE.parent.mkdir(exist_ok=True)
    _GROUPS_FILE.write_text(
        json.dumps([g.model_dump() for g in groups], ensure_ascii=False, default=str),
        encoding="utf-8",
    )


def list_groups() -> list[ItemGroup]:
    return _load()


def get_group(group_id: str) -> ItemGroup | None:
    return next((g for g in _load() if g.id == group_id), None)


def create_group(inp: GroupInput) -> ItemGroup:
    group = ItemGroup(
        id=str(uuid.uuid4()),
        name=inp.name,
        item_names=inp.item_names,
        created_at=datetime.now(timezone.utc),
    )
    groups = _load()
    groups.append(group)
    _save(groups)
    return group


def update_group(group_id: str, patch: GroupPatch) -> ItemGroup | None:
    groups = _load()
    for i, g in enumerate(groups):
        if g.id == group_id:
            updated = g.model_copy(update={k: v for k, v in patch.model_dump().items() if v is not None})
            groups[i] = updated
            _save(groups)
            return updated
    return None


def delete_group(group_id: str) -> bool:
    groups = _load()
    filtered = [g for g in groups if g.id != group_id]
    if len(filtered) == len(groups):
        return False
    _save(filtered)
    return True


def sync_group_background(group_id: str) -> None:
    group = get_group(group_id)
    if group is None:
        return
    for name in group.item_names:
        try:
            items_svc.sync_item(name)
        except (ValueError, SteamRateLimitError):
            pass
        time.sleep(3)
