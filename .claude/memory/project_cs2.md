---
name: CS2 Arbitrage Tracker Project
description: FastAPI project for CS2 case/item arbitrage — tracks price gaps between CSFloat and Steam to buy keys cheaply
type: project
---

**Project:** CS2 case arbitrage tracker — FastAPI API at `src/main.py`

**Core strategy:** Buy cases/skins on CSFloat (cheaper), sell on Steam, accumulate Steam balance for buying CS2 keys at EUR 2.19 each. The "multiplier" = (steam_price / 1.15) / (csf_price * 1.028).

**Key decisions:**
- Data source: CSROI public endpoints only — no Steam/CSFloat API keys needed
- All CSROI data is USD; display in EUR via Frankfurter API
- Key cost: always EUR 2.19 / $2.49 (Steam fixed price)
- No raw dicts — CSROI responses parsed into typed CsroiCase/CsroiDealItem models via validation_alias
- ArbitrageBase model auto-rounds all floats to max 3 decimals
- Data store: JSON file DB + in-memory (store.py), user-controlled sync via POST /sync
- Steam rate limited to 20 req/min (global rate limiter in clients/steam.py)
- All name lookups are case-insensitive
- Package manager: uv (not pip)

**Architecture (V2):**
```
src/
  main.py, config.py, utils.py, store.py
  clients/    — steam.py (rate-limited)
  models/     — base.py, csroi.py, item.py, deal.py, scenario.py
  services/   — tracker, deals, items, scenario
  routers/    — cases, deals, lookup, scenarios
```

**API endpoints:** GET /cases, GET /cases/{id}, GET /deals, GET /lookup, POST /scenarios, GET /scenarios, POST /sync, GET /exchange-rate

**CSROI confirmed IDs:** Prisma=10, Prisma 2=7, Horizon=26, Chroma 3=13

**Why:** User plays CS2 and was doing this manually via Excel. Automating to spot opportunities faster.

**How to apply:** Match Excel formula conventions, keep modules decoupled, use typed Pydantic models everywhere (no dicts), user prefers uv over pip, FastAPI, strong typing with dot access.
