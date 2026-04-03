# Restructure: CLI scripts → FastAPI API in src/

## Context

The current code is a flat directory of CLI scripts with mixed concerns (HTTP fetching, business logic, print formatting all co-located). The user wants:
- An API-first design (FastAPI + Swagger at `/docs`)
- Clean separation of external API response schemas vs internal domain models
- Object-oriented approach (not Excel "rows")
- `src/` folder structure
- `main.py` as entrypoint (not individual CLIs)
- Fix: `csf_unit_cost_eur` should store raw CSFloat price (no deposit multiplication); remove `effective_key_cost_eur`
- Steam `item_nameid` scraping deferred to later phase

---

## New Repo Structure

```
CS2/
├── .claude/                    # Claude Code project config (CLAUDE.md, plans)
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + uvicorn entrypoint
│   ├── config.py               # constants (fees, key cost, cache TTLs)
│   ├── clients/                # external API clients (HTTP + caching only)
│   │   ├── __init__.py
│   │   ├── csroi.py            # CSROI endpoints + cache
│   │   ├── steam.py            # Steam priceoverview + cache
│   │   └── exchange.py         # Frankfurter FX rate + cache
│   ├── models/                 # domain models (what the API returns)
│   │   ├── __init__.py
│   │   ├── item.py             # ItemEfficiency (cases + skins)
│   │   ├── deal.py             # Deal (CSFloat arbitrage opportunity)
│   │   ├── lookup.py           # ItemLookup (single item by name)
│   │   └── scenario.py         # ScenarioAllocation, ScenarioItem, ScenarioResult
│   ├── services/               # business logic (pure functions on models)
│   │   ├── __init__.py
│   │   ├── tracker.py          # item efficiency calculations
│   │   ├── deals.py            # deal scanning + filtering
│   │   ├── items.py            # single item lookup + multiplier
│   │   └── scenario.py         # buy order computation + save/load
│   └── routers/                # FastAPI route definitions
│       ├── __init__.py
│       ├── items.py            # GET /items (efficiency), GET /items/lookup
│       ├── deals.py            # GET /deals
│       └── scenarios.py        # POST /scenarios, GET /scenarios, GET /scenarios/{id}
├── cache/                      # auto-managed (gitignored)
├── scenarios/                  # saved scenarios
├── watchlist.json
├── pyproject.toml
└── plan.md
```

---

## Key Design Decisions

### No mirroring of external API schemas

We do NOT create Pydantic models that replicate the CSROI/Steam JSON structure. Those APIs have dozens of fields and change without notice — maintaining mirror schemas is pointless overhead. Instead:

- **Clients** (`clients/`) fetch raw JSON and extract only the fields we need
- **Models** (`models/`) define OUR domain objects with `Field(alias="...")` for mapping from JSON field names. If CSROI renames `CollectionPriceCSFloat` tomorrow, we change one alias, not a schema.

```python
# models/item.py — ItemEfficiency is the central model
class ItemEfficiency(BaseModel):
    """An item (case or skin) with arbitrage efficiency metrics.
    
    Field order matches the Excel Efficiency Table columns.
    Uses Field(alias=...) so these can be constructed directly 
    from CSROI JSON without manual mapping boilerplate.
    """
    name: str = Field(alias="Name")
    collection_id: int = Field(alias="CollectionId")
    drop_type: str = Field(alias="DropType")
    num_listings: int = Field(alias="NumListings")

    csf_price_usd: float = Field(alias="CollectionPriceCSFloat")
    steam_price_usd: float = Field(alias="CollectionPriceSteam")
    csf_price_eur: float              # computed: csf_price_usd * rate
    steam_price_eur: float            # computed: steam_price_usd * rate

    csf_cost_with_fee_eur: float      # csf_price_eur * 1.028
    steam_net_eur: float              # steam_price_eur / 1.15
    multiplier: float                 # steam_net_eur / csf_cost_with_fee_eur
    profit_per_100_eur: float         # (multiplier - 1) * 100
    steam_balance_per_100_eur: float  # multiplier * 100

    roi_csroi: float = Field(alias="CSFloatROI")
    profit_prob: float = Field(alias="ProfitCSFloat")

    model_config = ConfigDict(populate_by_name=True)
```

**Why `ItemEfficiency` not `CaseEfficiency`:** This applies to any item (cases, skins), not just cases. Same efficiency table formula works for both.

```python
# models/deal.py
class Deal(BaseModel):
    """An item-level arbitrage opportunity from CSFloat."""
    name: str
    csf_price_usd: float            # raw (no fee)
    csroi_steam_price_usd: float
    csroi_ratio: float
    verified_steam_lowest_eur: float | None = None
    verified_steam_median_eur: float | None = None
    volume_24h: int | None = None
    multiplier: float                # computed
    liquidity: str                   # high/medium/low/unknown
    verified: bool
```

```python
# models/scenario.py
class ScenarioAllocation(BaseModel):
    """One item in a buy scenario."""
    name: str
    pct: float                       # 0.0-1.0

class ScenarioItem(BaseModel):
    """Computed result for one allocation."""
    name: str
    pct: float
    budget_alloc_eur: float
    csf_price_eur: float             # raw per-unit (NO fee)
    steam_price_eur: float
    quantity: int                    # floor(budget / (csf*1.028))
    csf_spend_eur: float             # quantity * csf_price
    spend_with_fee_eur: float        # quantity * csf_price * 1.028
    steam_proceeds_eur: float        # quantity * steam_price / 1.15
    keys_raw: float

class ScenarioResult(BaseModel):
    """Full scenario output."""
    label: str
    budget_eur: float
    items: list[ScenarioItem]        # NOT "rows"
    total_quantity: int
    total_csf_spend_eur: float
    total_spend_with_fee_eur: float
    total_steam_proceeds_eur: float
    keys_raw: float
    keys_final: int
    leftover_steam_eur: float
```

Note: `csf_price_eur` is the raw price. The deposit fee is only applied in computed fields like `csf_cost_with_fee_eur` and `spend_with_fee_eur`. Removed `effective_key_cost_eur`.

---

## API Endpoints

### Items (efficiency table)

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| `GET` | `/items` | Ranked item efficiency table (from watchlist) | `list[ItemEfficiency]` |
| `GET` | `/items?names=Prisma Case,Horizon Case` | Filter to specific items | `list[ItemEfficiency]` |
| `GET` | `/items/{collection_id}` | Single item by CSROI ID | `ItemEfficiency` |

### Deals

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| `GET` | `/deals?max_ratio=0.60` | CSFloat items below ratio threshold | `list[Deal]` |
| `GET` | `/deals?max_ratio=0.60&verify=true&limit=20` | Same but verified against Steam | `list[Deal]` |

### Scenarios

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| `POST` | `/scenarios` | Compute a buy scenario | `ScenarioResult` |
| `POST` | `/scenarios?save=true&executed=false` | Compute + save to disk | `ScenarioResult` |
| `GET` | `/scenarios` | List saved scenarios | `list[ScenarioSummary]` |
| `GET` | `/scenarios/{filename}` | Load a saved scenario | `SavedScenario` |

### Items (single item lookup)

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| `GET` | `/items/lookup?name=Sport Gloves \| Vice (Minimal Wear)` | Lookup any item by full name | `ItemLookup` |

**What it does:** Takes a human-readable item name (e.g. `"Sport Gloves | Vice (Minimal Wear)"`), constructs the Steam `market_hash_name` (URL-encoding), calls Steam `priceoverview` to get `lowest_price`, `median_price`, `volume`. Then computes the multiplier for that item if a `csf_price` query param is also provided.

```python
# models/item.py
class ItemLookup(BaseModel):
    """Result of looking up a single item by name."""
    name: str
    market_hash_name: str              # URL-encoded form used in Steam API
    steam_lowest_price_eur: float | None
    steam_median_price_eur: float | None
    volume_24h: int | None
    csf_price_eur: float | None        # provided by caller (from CSFloat listing)
    multiplier_lowest: float | None    # (steam_lowest / 1.15) / (csf * 1.028)
    multiplier_median: float | None    # (steam_median / 1.15) / (csf * 1.028)
```

**Usage flow:** User sees an item on CSFloat for €X, hits `/items/lookup?name=Sport Gloves | Vice (Minimal Wear)&csf_price=150.00` and instantly gets the multiplier for both lowest and median Steam prices.

### Utility

| Method | Path | Description | Returns |
|--------|------|-------------|---------|
| `GET` | `/exchange-rate` | Current cached USD→EUR rate | `{"rate": float, "fetched_at": str}` |
| `POST` | `/cache/refresh` | Force-refresh all caches | `{"refreshed": [...]}` |

---

## Files to Create (in order)

| # | File | What it does |
|---|------|-------------|
| 1 | `src/__init__.py` | Empty |
| 2 | `src/config.py` | Constants: fees, key costs, cache TTLs, paths |
| 3 | `src/models/__init__.py` | Empty |
| 4 | `src/models/item.py` | ItemEfficiency (the central efficiency model) |
| 5 | `src/models/deal.py` | Deal (CSFloat arbitrage item) |
| 6 | `src/models/lookup.py` | ItemLookup (single item by name from Steam) |
| 7 | `src/models/scenario.py` | ScenarioAllocation, ScenarioItem, ScenarioResult, SavedScenario |
| 8 | `src/clients/__init__.py` | Empty |
| 9 | `src/clients/csroi.py` | fetch_all_cases(), fetch_market_ratios(), fetch_price_history() |
| 10 | `src/clients/steam.py` | verify_steam_price(), lookup_item() |
| 11 | `src/clients/exchange.py` | fetch_exchange_rate() |
| 12 | `src/services/__init__.py` | Empty |
| 13 | `src/services/tracker.py` | compute_item_efficiency(), get_tracked_items() |
| 14 | `src/services/deals.py` | scan_deals(), verify_deals() |
| 15 | `src/services/items.py` | lookup_item_multiplier() |
| 16 | `src/services/scenario.py` | build_scenario(), save_scenario(), list/load |
| 17 | `src/routers/__init__.py` | Empty |
| 18 | `src/routers/items.py` | GET /items, GET /items/lookup |
| 19 | `src/routers/deals.py` | GET /deals |
| 20 | `src/routers/scenarios.py` | POST/GET /scenarios |
| 21 | `src/main.py` | FastAPI app, include routers, uvicorn.run() |

## Files to Delete

Old flat files replaced by the new structure:
- `tracker.py`, `deals.py`, `scenario.py`, `fetcher.py`, `models.py`
- `main.py`, `test.py` (empty placeholders)
- `prisma.json` (empty)

## Files to Update

- `pyproject.toml` — add `fastapi`, `uvicorn` dependencies
- `.gitignore` — add `cache/`, `scenarios/`, `__pycache__/`

## Claude Code Config

Move `.claude/` into the project root (`CS2/.claude/`) so project-specific config (CLAUDE.md, plans, memory) lives with the repo, not in the global user directory.

---

## Verification

1. `uv run src/main.py` → starts FastAPI server
2. Open `http://localhost:8000/docs` → Swagger UI with all endpoints
3. `GET /cases` → returns ranked case efficiency JSON
4. `GET /deals?max_ratio=0.50` → returns deal items
5. `POST /scenarios` with body `{"budget_eur": 100, "allocations": [{"name": "Prisma Case", "pct": 0.5}, {"name": "Chroma 3 Case", "pct": 0.5}]}` → returns scenario result
6. `POST /scenarios?save=true` → saves to `scenarios/` directory
