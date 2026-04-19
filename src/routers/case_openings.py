"""Routes: CRUD + item management for case opening sessions."""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from src.models.case_opening import (
    CaseOpening,
    CaseOpeningCreate,
    CaseOpeningItemInput,
    CaseOpeningItemStatusPatch,
    CaseOpeningPatch,
    CaseOpeningSummary,
)
from src.services import case_openings as svc
from src.services.steam import SteamRateLimitError, get_rate_limit_status

router = APIRouter(prefix="/case-openings", tags=["Case Openings"])


@router.get("", response_model=list[CaseOpeningSummary])
def list_sessions() -> list[CaseOpeningSummary]:
    return svc.list_sessions()


@router.post("", response_model=CaseOpening, status_code=201)
def create_session(inp: CaseOpeningCreate) -> CaseOpening:
    return svc.create_session(inp)


@router.get("/{session_id}", response_model=CaseOpening)
def get_session(session_id: str) -> CaseOpening:
    session = svc.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session


@router.patch("/{session_id}", response_model=CaseOpening)
def update_session(session_id: str, patch: CaseOpeningPatch) -> CaseOpening:
    session = svc.update_session(session_id, patch)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str) -> None:
    if not svc.delete_session(session_id):
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")


@router.post("/{session_id}/items", response_model=CaseOpening)
def add_item(session_id: str, inp: CaseOpeningItemInput) -> CaseOpening:
    session = svc.add_item(session_id, inp)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    return session


@router.delete("/{session_id}/items/{index}", response_model=CaseOpening)
def remove_item(session_id: str, index: int) -> CaseOpening:
    session = svc.remove_item(session_id, index)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or index out of range")
    return session


@router.post("/{session_id}/items/{index}/sync", response_model=CaseOpening)
def sync_item(session_id: str, index: int) -> CaseOpening:
    status = get_rate_limit_status()
    if status["retry_after_seconds"] is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Steam rate limit hit — retry in {status['retry_after_seconds']}s",
        )
    try:
        session = svc.sync_item(session_id, index)
    except SteamRateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or index out of range")
    return session


@router.patch("/{session_id}/items/{item_id}/status", response_model=CaseOpening)
def update_item_status(session_id: str, item_id: str, patch: CaseOpeningItemStatusPatch) -> CaseOpening:
    """Update status and marketplace for a specific item. Appends to status history."""
    session = svc.update_item_status(session_id, item_id, patch)
    if session is None:
        raise HTTPException(status_code=404, detail="Session or item not found")
    return session


@router.post("/{session_id}/sync", status_code=202)
def sync_session(session_id: str, background_tasks: BackgroundTasks) -> dict:
    """Sync all items in this session sequentially in the background."""
    session = svc.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
    background_tasks.add_task(svc.sync_session_background, session_id)
    return {"message": "Session sync started", "item_count": len(session.items)}
