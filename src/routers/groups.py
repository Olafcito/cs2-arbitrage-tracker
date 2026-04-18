"""Routes: CRUD + sync for item groups."""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from src.models.group import GroupInput, GroupPatch, ItemGroup
from src.services import groups as groups_svc

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("", response_model=list[ItemGroup])
def list_groups() -> list[ItemGroup]:
    return groups_svc.list_groups()


@router.post("", response_model=ItemGroup, status_code=201)
def create_group(inp: GroupInput) -> ItemGroup:
    return groups_svc.create_group(inp)


@router.get("/{group_id}", response_model=ItemGroup)
def get_group(group_id: str) -> ItemGroup:
    group = groups_svc.get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail=f"Group not found: {group_id}")
    return group


@router.patch("/{group_id}", response_model=ItemGroup)
def update_group(group_id: str, patch: GroupPatch) -> ItemGroup:
    group = groups_svc.update_group(group_id, patch)
    if group is None:
        raise HTTPException(status_code=404, detail=f"Group not found: {group_id}")
    return group


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str) -> None:
    if not groups_svc.delete_group(group_id):
        raise HTTPException(status_code=404, detail=f"Group not found: {group_id}")


@router.post("/{group_id}/sync", status_code=202)
def sync_group(group_id: str, background_tasks: BackgroundTasks) -> dict:
    """Sync all items in the group sequentially in the background."""
    group = groups_svc.get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail=f"Group not found: {group_id}")
    background_tasks.add_task(groups_svc.sync_group_background, group_id)
    return {"message": "Group sync started", "item_count": len(group.item_names)}
