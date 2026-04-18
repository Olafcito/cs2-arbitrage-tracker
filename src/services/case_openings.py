"""Service: case opening session CRUD + item sync."""

import json
import time
import uuid
from datetime import datetime, timezone

from src.config import PROJECT_DIR
from src.models.case_opening import (
    CaseOpening,
    CaseOpeningCreate,
    CaseOpeningItem,
    CaseOpeningItemInput,
    CaseOpeningPatch,
    CaseOpeningSummary,
)
from src.services.csfloat import fetch_lowest_price as csfloat_fetch
from src.services.steam import SteamRateLimitError, fetch_price_overview
from src.utils import fetch_exchange_rate

_DATA_DIR = PROJECT_DIR / "data" / "case_openings"


def _path(session_id: str):
    return _DATA_DIR / f"{session_id}.json"


def _compute_rois(session: CaseOpening) -> CaseOpening:
    items = session.items
    n = len(items)
    if n == 0 or session.unbox_price <= 0:
        return session

    csf_values = [i.csf_price_eur for i in items if i.csf_price_eur is not None]
    steam_values = [i.steam_price_eur for i in items if i.steam_price_eur is not None]

    total_csf = sum(v * 0.98 for v in csf_values) if csf_values else None
    total_steam_net = sum(v / 1.15 for v in steam_values) if steam_values else None

    csf_roi = total_csf / session.unbox_price if total_csf is not None else None
    steam_roi = total_steam_net / (n * session.unbox_price) if total_steam_net is not None else None
    csf_roi_mult = csf_roi * session.multiplier if csf_roi is not None else None

    return session.model_copy(update={
        "csf_roi": csf_roi,
        "steam_roi": steam_roi,
        "csf_roi_multiplied": csf_roi_mult,
        "total_csf_value": total_csf,
        "total_steam_net": total_steam_net,
    })


def _load(session_id: str) -> CaseOpening | None:
    p = _path(session_id)
    if not p.exists():
        return None
    return CaseOpening.model_validate(json.loads(p.read_text(encoding="utf-8")))


def _save(session: CaseOpening) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = session.model_dump()
    _path(session.id).write_text(
        json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8"
    )


def list_sessions() -> list[CaseOpeningSummary]:
    if not _DATA_DIR.exists():
        return []
    summaries = []
    for p in sorted(_DATA_DIR.glob("*.json")):
        raw = CaseOpening.model_validate(json.loads(p.read_text(encoding="utf-8")))
        computed = _compute_rois(raw)
        summaries.append(CaseOpeningSummary(
            id=raw.id,
            name=raw.name,
            date=raw.date,
            item_count=len(raw.items),
            unbox_price=raw.unbox_price,
            multiplier=raw.multiplier,
            csf_roi=computed.csf_roi,
            steam_roi=computed.steam_roi,
        ))
    return summaries


def get_session(session_id: str) -> CaseOpening | None:
    raw = _load(session_id)
    if raw is None:
        return None
    return _compute_rois(raw)


def create_session(inp: CaseOpeningCreate) -> CaseOpening:
    session = CaseOpening(
        id=str(uuid.uuid4()),
        name=inp.name,
        date=inp.date,
        unbox_price=inp.unbox_price,
        multiplier=inp.multiplier,
        created_at=datetime.now(timezone.utc),
    )
    _save(session)
    return _compute_rois(session)


def update_session(session_id: str, patch: CaseOpeningPatch) -> CaseOpening | None:
    session = _load(session_id)
    if session is None:
        return None
    updates = {k: v for k, v in patch.model_dump().items() if v is not None}
    updated = session.model_copy(update=updates)
    _save(updated)
    return _compute_rois(updated)


def delete_session(session_id: str) -> bool:
    p = _path(session_id)
    if not p.exists():
        return False
    p.unlink()
    return True


def add_item(session_id: str, inp: CaseOpeningItemInput) -> CaseOpening | None:
    session = _load(session_id)
    if session is None:
        return None
    item = CaseOpeningItem(name=inp.name, wear=inp.wear, float_value=inp.float_value)
    updated = session.model_copy(update={"items": [*session.items, item]})
    _save(updated)
    return _compute_rois(updated)


def remove_item(session_id: str, index: int) -> CaseOpening | None:
    session = _load(session_id)
    if session is None or index < 0 or index >= len(session.items):
        return None
    items = [i for j, i in enumerate(session.items) if j != index]
    updated = session.model_copy(update={"items": items})
    _save(updated)
    return _compute_rois(updated)


def sync_item(session_id: str, index: int) -> CaseOpening | None:
    session = _load(session_id)
    if session is None or index < 0 or index >= len(session.items):
        return None

    item = session.items[index]
    rate = fetch_exchange_rate()

    csf_usd = csfloat_fetch(item.name, min_float=item.float_value)
    csf_eur = csf_usd * rate if csf_usd is not None else item.csf_price_eur

    steam = fetch_price_overview(item.name)
    steam_eur = steam.lowest_price_eur if steam.lowest_price_eur is not None else item.steam_price_eur

    synced_item = item.model_copy(update={
        "csf_price_eur": csf_eur,
        "steam_price_eur": steam_eur,
        "last_synced_at": datetime.now(timezone.utc),
    })
    items = [synced_item if j == index else i for j, i in enumerate(session.items)]
    updated = session.model_copy(update={"items": items})
    _save(updated)
    return _compute_rois(updated)


def sync_session_background(session_id: str) -> None:
    session = _load(session_id)
    if session is None:
        return
    for i in range(len(session.items)):
        try:
            sync_item(session_id, i)
        except (SteamRateLimitError, Exception):
            pass
        time.sleep(3)
