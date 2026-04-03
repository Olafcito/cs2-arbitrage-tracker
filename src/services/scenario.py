"""Service: buy order scenario builder with save/load."""

from __future__ import annotations

import math
from datetime import datetime, timezone

from src.config import CSF_DEPOSIT_MULT, KEY_COST_EUR, SCENARIOS_DIR, STEAM_FEE_DIVISOR
from src.models.scenario import (
    SavedScenario,
    ScenarioInput,
    ScenarioItem,
    ScenarioResult,
    ScenarioSummary,
)
from src.services.cases import find_cases_by_names
from src.utils import fetch_exchange_rate


def build_scenario(inp: ScenarioInput) -> ScenarioResult:
    """Compute a full buy-order scenario."""
    rate = fetch_exchange_rate()
    names = [a.name for a in inp.allocations]
    matched, missing = find_cases_by_names(names)

    if missing:
        raise ValueError(f"Items not found in CSROI data: {', '.join(missing)}")

    price_map = {case.name.lower(): case for case in matched}

    items: list[ScenarioItem] = []
    for alloc in inp.allocations:
        case = price_map[alloc.name.lower()]
        csf_eur = case.csf_price_usd * rate
        steam_eur = case.steam_price_usd * rate

        budget_alloc = inp.budget_eur * alloc.pct
        csf_unit_cost = csf_eur * CSF_DEPOSIT_MULT
        quantity = math.floor(budget_alloc / csf_unit_cost) if csf_unit_cost > 0 else 0
        csf_spend = quantity * csf_eur
        spend_with_fee = quantity * csf_unit_cost
        steam_proceeds = quantity * steam_eur / STEAM_FEE_DIVISOR
        keys_raw = steam_proceeds / KEY_COST_EUR

        items.append(ScenarioItem(
            name=case.name,
            pct=alloc.pct,
            budget_alloc_eur=budget_alloc,
            csf_price_eur=csf_eur,
            steam_price_eur=steam_eur,
            quantity=quantity,
            csf_spend_eur=csf_spend,
            spend_with_fee_eur=spend_with_fee,
            steam_proceeds_eur=steam_proceeds,
            keys_raw=keys_raw,
        ))

    total_quantity = sum(i.quantity for i in items)
    total_csf = sum(i.csf_spend_eur for i in items)
    total_fee = sum(i.spend_with_fee_eur for i in items)
    total_steam = sum(i.steam_proceeds_eur for i in items)
    keys_raw_total = sum(i.keys_raw for i in items)
    keys_final = math.floor(keys_raw_total)
    leftover = total_steam - keys_final * KEY_COST_EUR

    return ScenarioResult(
        label=inp.label,
        budget_eur=inp.budget_eur,
        items=items,
        total_quantity=total_quantity,
        total_csf_spend_eur=total_csf,
        total_spend_with_fee_eur=total_fee,
        total_steam_proceeds_eur=total_steam,
        keys_raw=keys_raw_total,
        keys_final=keys_final,
        leftover_steam_eur=leftover,
    )


def save_scenario(result: ScenarioResult, executed: bool = False) -> str:
    """Save a scenario to scenarios/ as JSON. Returns the filename."""
    SCENARIOS_DIR.mkdir(exist_ok=True)
    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = result.label.replace(" ", "_").lower() if result.label else "scenario"
    filename = f"{date_str}_{slug}.json"
    path = SCENARIOS_DIR / filename

    counter = 1
    while path.exists():
        counter += 1
        filename = f"{date_str}_{slug}_{counter}.json"
        path = SCENARIOS_DIR / filename

    payload = SavedScenario(
        saved_at=datetime.now(timezone.utc).isoformat(),
        executed=executed,
        result=result,
    )
    path.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return filename


def list_scenarios() -> list[ScenarioSummary]:
    """List all saved scenario files as summaries."""
    if not SCENARIOS_DIR.exists():
        return []

    summaries = []
    for path in sorted(SCENARIOS_DIR.glob("*.json"), reverse=True):
        try:
            saved = SavedScenario.model_validate_json(path.read_text(encoding="utf-8"))
            summaries.append(ScenarioSummary(
                filename=path.name,
                label=saved.result.label,
                saved_at=saved.saved_at,
                executed=saved.executed,
                budget_eur=saved.result.budget_eur,
                keys_final=saved.result.keys_final,
            ))
        except Exception:
            continue
    return summaries


def load_scenario(filename: str) -> SavedScenario:
    """Load a saved scenario by filename."""
    path = SCENARIOS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Scenario not found: {filename}")
    return SavedScenario.model_validate_json(path.read_text(encoding="utf-8"))
