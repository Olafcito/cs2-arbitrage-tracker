# CS2 Case Arbitrage & ROI Tracker — Project Plan

> This document provides full context of the project, the logic behind the math, and the roadmap for the automated tracking system. Intended for any collaborator (human or AI).

---

## 1. Project Context: The Arbitrage Edge

The core of this project exploits the price gap between third-party marketplaces (CSFloat) and the Steam Community Market.

**The Goal:** Buy cases or skins at a discount on CSFloat, then sell them on Steam to accumulate Steam Balance — which is then used to buy CS2 keys at €2.19 each. The result is buying keys at an effective cost below face value.

**Two distinct arbitrage strategies:**

| Strategy | How it works | Key metric |
|----------|-------------|------------|
| **Case flip** | Buy case on CSFloat, sell directly on Steam (no unboxing) | Multiplier > 1.0x |
| **Item flip** | Buy a discounted skin on CSFloat, sell on Steam | Multiplier > 1.0x |

Both strategies use the same multiplier formula. The difference is the data source: cases come from CSROI's `allTrackedCases.json`; items come from CSROI's `marketRatios.json` (deals endpoint), verified against live Steam prices.

**Keys are non-tradeable since October 2019.** You can only buy keys from Steam at the fixed regional price (€2.19 / $2.49). Any `KeyCostCSFloat` figure in CSROI data is a synthetic estimate and cannot be acted on.

---

## 2. Excel V0 — The Strategy Lab

The spreadsheet is the reference implementation. All Python code replicates and extends its logic.

### Assumptions (fixed constants)

| Parameter | Value | Note |
|-----------|-------|------|
| Key price | €2.19 | Steam fixed EUR price |
| Steam fee | 15% | Formula: `steam_net = steam_price / 1.15` |
| CSFloat deposit fee | 2.8% | `csf_total = csf_price × 1.028` |

> **Formula note:** The Excel computes `steam_net = steam_price / 1.15`, treating the fee as additive on top of the seller's net. The exact Steam calculation is `steam_price × 0.85` (seller keeps 85%). The difference is ~2.3% — small but present. All Python code uses `/1.15` to stay consistent with the spreadsheet.

### Efficiency Table (per case or item)

| Column | Formula |
|--------|---------|
| CSFloat cost incl. fee | `csf_price × 1.028` |
| Steam net | `steam_price / 1.15` |
| **Multiplier** | `(steam_price / 1.15) / (csf_price × 1.028)` |
| Profit per €100 | `(multiplier − 1) × 100` |
| Steam balance per €100 | `multiplier × 100` |
| Keys per €100 | `steam_bal_per_100 / 2.19` |
| Cases/items per €100 | `100 / (csf_price × 1.028)` |

### Buy Order Table (transaction planner)

Given a budget and % allocation per case:

| Column | Formula |
|--------|---------|
| Budget allocated | `budget × pct_split` |
| Cases (actual) | `floor(budget_alloc / (csf_price × 1.028))` |
| CSFloat spend | `cases × csf_price` |
| Spend + deposit fee | `cases × csf_price × 1.028` |
| Steam proceeds | `cases × steam_price / 1.15` |
| Keys (raw) | `steam_proceeds / 2.19` |

**Rounding rule:** Sum all keys (raw) across all cases first, then `floor()` once at the end. This prevents "dust" loss from per-case rounding.

### Summary

Total cashout, total steam proceeds, keys final (floored), leftover Steam balance.

---

## 3. Data Sources

### CSROI (primary — no API key needed)

| Endpoint | Refresh | Use |
|----------|---------|-----|
| `csroi.com/pastData/allTrackedCases.json` | 24h | All cases: prices, ROI, rarity values |
| `api.csroi.com/marketRatios.json` | 1h | Per-item platform ratios (deals/flipper) |
| `csroi.com/pastData/{id}/{market}/CaseCost.json` | 24h | Daily price history per case |

**`allTrackedCases.json` key fields:**
- `CollectionPriceSteam` / `CollectionPriceCSFloat` — case price in USD
- `KeyCostSteam` — always $2.49 (the only real key cost)
- `RarityValuesCSFloat`, `RarityChances` — for corrected unboxing ROI
- `{Platform}iROI`, `{Platform}1MiROI`, `{Platform}6MiROI` — investment appreciation ROIs
- `ProfitCSFloat` — probability of profitable unbox
- `CollectionId` — used as `{id}` in price history URLs

**Confirmed IDs:** Prisma Case = 10, Prisma 2 Case = 7

**`marketRatios.json` structure:**
```json
{
  "csfloat": {
    "best_case": 0.4357,
    "average_case": 0.8389,
    "easily_achievable_case": 0.78,
    "ratios": [
      { "ratio": 0.44, "item": "MP7 | Amberline (FT)", "steam_price": 1.20, "price": 0.53 },
      ...
    ]
  }
}
```
`ratio = csf_price / steam_price`. Items with ratio < 0.60 are best candidates (>40% cheaper than Steam).

**`CaseCost.json` format:** `[[unix_timestamp, total_cost_usd], ...]`
CRITICAL: stores `case_price + key_cost`, not case price alone. To get raw case price: `CaseCost[day][1] − KeyCostSteam`.

### Steam Market API (for deal verification only)

`priceoverview` endpoint:
```
https://steamcommunity.com/market/priceoverview/?appid=730&market_hash_name={name}&currency=3
```
- `currency=3` = EUR
- Returns: `lowest_price`, `median_price`, `volume` (24h sales)
- Use to verify CSROI's deal prices are still accurate before acting
- **Rate limit:** 1 request per 3–5 seconds (strict — Steam blocks aggressively)

`itemordershistogram` endpoint (buy orders — deferred):
- Requires `item_nameid` which must be scraped from the Steam market item page
- Not worth the added complexity for Phase 1; `priceoverview` lowest_price is sufficient
- Revisit if buy-order price becomes important for precision

### Exchange Rate

`https://api.frankfurter.app/latest?from=USD&to=EUR` — ECB data, free, no key. Cache 6h.
CSROI has no exchange rate API. All CSROI prices are USD; we convert for display only.

---

## 4. System Architecture

```
cs2/
├── fetcher.py        # all HTTP + caching (single shared data access layer)
├── models.py         # Pydantic models for all data types
├── tracker.py        # Component A: case efficiency table (CLI)
├── deals.py          # Component B: item deals scanner (CLI)
├── scenario.py       # Component C: buy order scenario builder
├── watchlist.json    # user list of cases to track
└── cache/            # auto-managed cache files
    ├── allTrackedCases.json
    ├── marketRatios.json
    └── exchange_rate.json
```

**Design principles:**
- `fetcher.py` owns all network calls and cache logic. Nothing else touches HTTP.
- `models.py` owns all data shapes (Pydantic). All computed fields live here.
- Each component script (`tracker`, `deals`, `scenario`) is independently runnable.
- No web framework yet — CLI outputs now, structured for a future dashboard layer.

---

## 5. Components

### Component A: Case Efficiency Tracker (`tracker.py`) — exists

Ranks cases in `watchlist.json` by arbitrage multiplier. Refreshes CSROI data daily.

**Output:**
```
Rank  Case                      CSF(EUR)  STM(EUR)   Mult    ROI*  Profit%  Listings
1     Horizon Case                  1.36      2.21   1.34x   63.0%    9.5%     9,471
2     Prisma Case                   1.22      1.96   1.33x   61.7%   14.2%    14,538
```
*ROI corrected uses $2.49 key cost (not CSROI's phantom $1.94 CSFloat key).

**To refactor (next):** Move HTTP + cache logic into `fetcher.py`, use `models.py` types.

---

### Component B: Item Deals Scanner (`deals.py`) — to build

Scans CSROI's `marketRatios.json` for individual skins with the best arbitrage ratio, then verifies prices against Steam's `priceoverview` endpoint.

**Pipeline:**
1. Fetch `marketRatios.json` (cache 1h) → extract `csfloat.ratios`
2. Filter: `ratio < threshold` (default 0.60, i.e. >40% cheaper than Steam)
3. For each qualifying item:
   - Call Steam `priceoverview` with the item's `market_hash_name`
   - Extract `lowest_price` (EUR), `median_price` (EUR), `volume`
   - Compute multiplier using verified Steam price: `(steam_lowest / 1.15) / (csf_price × 1.028)`
   - Liquidity score: weight down items with `volume < threshold` (e.g., < 10 sales/day)
4. Rank by `liquidity_adjusted_multiplier`, print table

**Rate limiting:** 3–5 second delay between Steam API calls. For 100 items that's 5–8 minutes; run in background or on a schedule.

**Output:**
```
Item                              CSF($)  STM($)  Mult   Volume  Score
MP7 | Amberline (FT)               0.53    1.20   1.78x    342   high
Galil AR | Galigator (BS)          0.97    2.53   2.14x     28   low
```

**Key model fields:**
```python
class DealItem(BaseModel):
    name: str
    csf_price_usd: float
    csroi_steam_price_usd: float   # from marketRatios, may be stale
    verified_steam_lowest_eur: float | None  # from priceoverview
    verified_steam_median_eur: float | None
    volume_24h: int | None
    csf_ratio: float               # csf / steam (raw from CSROI)
    multiplier: float              # computed from verified prices
    liquidity: str                 # "high" / "medium" / "low"
```

---

### Component C: Buy Order Scenario Builder (`scenario.py`) — to build

Replicates the Excel Buy Order table programmatically. User provides a budget and case/item allocations; it outputs the exact transaction plan.

**Input (CLI args or config dict):**
```python
{
  "budget_eur": 100.0,
  "allocations": [
    {"name": "Prisma Case", "pct": 0.50},
    {"name": "Chroma 3 Case", "pct": 0.50}
  ]
}
```

**Per-item calculation:**
```python
budget_alloc = budget × pct
csf_unit_cost = csf_price × 1.028          # with deposit fee
cases_actual  = floor(budget_alloc / csf_unit_cost)
csf_spend     = cases_actual × csf_price
spend_with_fee= cases_actual × csf_unit_cost
steam_proceeds= cases_actual × steam_price / 1.15
keys_raw      = steam_proceeds / 2.19
```

**Totals:**
```python
keys_final = floor(sum(all keys_raw))      # sum first, then floor once
leftover_steam = sum(steam_proceeds) - keys_final × 2.19
```

**Output mirrors the Excel Summary table:**
```
BUY ORDER  [Budget: €100.00]
Case         %     Cases  CSF Spend  +Fee     Steam Out  Keys(raw)
Chroma 3    50%      17    €47.77    €49.11    €65.04     29.70
Prisma      50%      40    €48.80    €50.17    €66.09     30.18
TOTAL              57     €96.57    €99.27   €131.13     59.88

KEYS (final):     59
Leftover Steam:   €1.92
```

**Key model:**
```python
class ScenarioResult(BaseModel):
    rows: list[BuyOrderRow]
    total_csf_spend: float
    total_spend_with_fee: float
    total_steam_proceeds: float
    keys_raw: float
    keys_final: int
    leftover_steam: float
```

**Scenario saving:** Each scenario can be saved as a JSON file in `scenarios/` with a timestamp and optional label (e.g., `2026-04-01_prisma_chroma3.json`). The save captures the input (prices at time of calculation) alongside the result, so historical purchases can be reviewed. Items in the allocation can be any case or skin — not limited to cases.

```
scenarios/
├── 2026-04-01_buy_prisma_chroma3.json    # saved after actual purchase
├── 2026-04-03_plan_horizon_test.json     # draft scenario not yet executed
└── ...
```

Each saved file includes: `{"label": ..., "saved_at": ..., "executed": true/false, "prices_at_save": {...}, "result": {...}}`.

---

## 6. Implementation Notes

- **Formula alignment:** All code uses `steam_net = steam_price / 1.15` to match Excel. Differs from exact Steam calculation (`× 0.85`) by ~2.3%.
- **Currency:** USD internally throughout. EUR for display only (Frankfurter API rate).
- **Key cost:** Always `$2.49 / €2.19` (Steam fixed price). Never use `KeyCostCSFloat` from CSROI.
- **CSROI unboxing ROI correction:** `ev_csf = Σ(RarityChances[tier] × RarityValuesCSFloat[tier])`, then `roi = ev_csf / (csf_price + 2.49)`. CSROI's `CSFloatROI` uses phantom key cost and is slightly optimistic.
- **`CaseCost.json` = case + key total cost.** To get case-only price history: subtract `KeyCostSteam` ($2.49) from each daily value.
- **`?v=` parameter** on CSROI API endpoints is JavaScript `Date.now()` (milliseconds) for CDN cache-busting. Append `?v={int(time.time()*1000)}` or omit.
