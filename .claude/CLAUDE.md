# CS2 Arbitrage Tracker

## What this project does

FastAPI-based API for CS2 case and item arbitrage between CSFloat and Steam. Buy items cheaply on CSFloat, sell on Steam, accumulate Steam balance to buy keys at EUR 2.19.

## Architecture

```
src/
├── main.py              # FastAPI app entrypoint
├── config.py            # Constants, paths, URLs
├── utils.py             # compute_multiplier(), fetch_exchange_rate(), build_arbitrage_item()
├── models/
│   ├── base.py          # ArbitrageBase — auto-rounds floats to 3 decimals
│   ├── csroi.py         # CsroiCase, CsroiDealItem (raw CSROI responses)
│   ├── steam.py         # SteamPrice (reusable sub-model)
│   ├── item.py          # ArbitrageItem, CaseType, SkinType, ItemInput
│   ├── deal.py          # Deal (uses SteamPrice composition)
│   └── scenario.py      # ScenarioAllocation, ScenarioInput, ScenarioItem, ScenarioResult
└── services/
    ├── steam.py         # Steam Market lookups (rate-limited 20/min)
    ├── cases.py         # CSROI case fetching + arbitrage computation
    ├── deals.py         # CSROI deal fetching + scanning + Steam verification
    ├── items.py         # Item CRUD — add/list/get/delete tracked items (persists to data/items.json)
    └── scenario.py      # Buy order computation + save/load
```

## Key conventions

- **No raw dicts**: Always use typed Pydantic models. Use model_dump() for serialization
- **Model composition**: SteamPrice is a reusable sub-model. ArbitrageItem has item_type (CaseType | SkinType) and optional steam_price
- **build_arbitrage_item()**: Single factory in utils.py for creating ArbitrageItem — no duplicated arbitrage math
- **Multiplier formula:** `(steam_price / 1.15) / (csf_price * 1.028)` — centralized in `src/utils.py`
- **Key cost:** Always EUR 2.19 / $2.49 (Steam fixed price). NEVER use `KeyCostCSFloat` from CSROI
- **Currency:** All CSROI data is USD. Convert to EUR using Frankfurter API (in utils.py)
- **No separate clients layer**: Each service owns its API calls + business logic together
- **No repository layer**: Item persistence is handled directly in services/items.py
- **ArbitrageBase:** All domain models inherit from this — auto-rounds floats to max 3 decimals
- **Steam rate limiting:** 20 requests/minute, enforced globally in `services/steam.py`
- **Case-insensitive:** All name-based lookups are case-insensitive
- **computed_field:** `market_hash_name` on ArbitrageItem is a Pydantic computed field (urllib.parse.quote)
- **Package manager:** uv (not pip)

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /cases | All cases from CSROI ranked by multiplier |
| GET | /cases?names=... | Filter by names (case-insensitive) |
| GET | /cases/{id} | Single case by CSROI CollectionId |
| POST | /items | Add item to track (auto-resolves prices from CSROI) |
| GET | /items | List all tracked items |
| GET | /items/{name} | Get tracked item by name |
| DELETE | /items/{name} | Remove tracked item |
| GET | /deals | CSFloat items below ratio threshold |
| GET | /deals?verify=true | Verify deals against Steam |
| GET | /lookup?name=... | Pure Steam Market price lookup (returns SteamPrice) |
| POST | /scenarios | Compute buy-order scenario |
| GET | /scenarios | List saved scenarios |
| GET | /scenarios/{file} | Load saved scenario |
| GET | /exchange-rate | Current USD to EUR rate |

## How to run

```bash
uv run python -m src.main    # starts on http://localhost:8000
# Swagger UI at http://localhost:8000/docs
```

## Confirmed CSROI IDs

Prisma Case = 10, Prisma 2 Case = 7, Horizon Case = 26, Chroma 3 Case = 13
