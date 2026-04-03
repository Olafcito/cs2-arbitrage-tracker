"""Routes: POST/GET /scenarios (buy order builder)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.models.scenario import (
    SavedScenario,
    ScenarioInput,
    ScenarioResult,
    ScenarioSummary,
)
from src.services.scenario import (
    build_scenario,
    list_scenarios,
    load_scenario,
    save_scenario,
)

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("", response_model=ScenarioResult)
def create_scenario(
    inp: ScenarioInput,
    save: bool = Query(False, description="Save scenario to disk"),
    executed: bool = Query(False, description="Mark as executed purchase"),
) -> ScenarioResult:
    """Compute a buy-order scenario from budget + allocations.

    Resolves item names to live prices from CSROI.
    """
    try:
        result = build_scenario(inp)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if save:
        save_scenario(result, executed=executed)

    return result


@router.get("", response_model=list[ScenarioSummary])
def get_scenarios() -> list[ScenarioSummary]:
    """List all saved scenarios."""
    return list_scenarios()


@router.get("/{filename}", response_model=SavedScenario)
def get_scenario(filename: str) -> SavedScenario:
    """Load a saved scenario by filename."""
    try:
        return load_scenario(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Scenario not found: {filename}")
