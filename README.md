# CS2 Arbitrage Tracker

Buy CS2 items cheap on CSFloat, sell on Steam, accumulate balance for keys.

FastAPI backend · React frontend · FastMCP server · pytest test suite.

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python · FastAPI · Pydantic v2 · uv |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query |
| MCP | FastMCP (stdio for Claude Desktop, HTTP for remote) |
| Tests | pytest · pytest-mock · requests-mock |

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager
- Node.js 18+ / npm

---

## Environment setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|----------|-----------------|
| `CSFLOAT_API_KEY` | [csfloat.com/profile](https://csfloat.com/profile) → Developer tab |
| `steamwebapi_key` | [steamwebapi.com](https://www.steamwebapi.com) → account dashboard |
| `steam_id` | Your 64-bit Steam ID |

The app runs without a CSFloat key — live price syncing falls back to CSROI data.

### SteamWebAPI rate limits (free tier)

| Endpoint | Per minute | Per day | Per month |
|----------|-----------|---------|-----------|
| Inventory | 2 | 5 | **5** |
| Global | 2 | 5 | 10 |
| Items | 0 | 0 | 0 |
| Assets | 5 | 5 | 5 |

`POST /inventory/sync` burns one monthly Inventory call. The cached snapshot is served from `data/inventory.json` by `GET /inventory` without any API calls.

---

## Running locally

### 1. Backend (FastAPI)

```bash
uv run python -m src.main
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

### 2. Frontend (React)
```bash
# First time only
npm install
```
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

Vite proxies `/api/*` to `localhost:8000` — no CORS setup needed.

### 3. MCP server (Claude Desktop)

Claude Desktop config (`%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "CS2 Arbitrage": {
      "command": "C:\\Users\\<you>\\.local\\bin\\uv.exe",
      "args": [
        "run", "--with", "fastmcp",
        "fastmcp", "run",
        "C:\\path\\to\\CS2\\mcp_server.py"
      ]
    }
  }
}
```

Restart Claude Desktop after editing. The hammer icon in a chat confirms the server is loaded.

#### MCP tools

| Tool | Description |
|------|-------------|
| `lookup_item` | CSFloat + Steam prices for any item |
| `list_deals` | Top CSFloat deals below a ratio threshold |
| `list_tracked` | Tracked items with live arbitrage metrics |
| `add_to_tracker` | Add an item to the tracked list |

Accepts tab-separated inventory format: `Glock-18 | Warhawk\tMinimal Wear\t0.13`

#### HTTP mode (ngrok / Cloudflare Tunnel)

```bash
uv run mcp_server.py --http
# → port 8001
```

---

## Running tests

```bash
uv run pytest tests/ -v
```

Unit tests run fully offline with mocks. Integration tests hit real APIs and are skipped by default:

```bash
# Steam integration
STEAM_INTEGRATION=1 uv run pytest tests/test_steam_client.py -v -k integration

# CSFloat integration (requires CSFLOAT_API_KEY in .env or env)
CSFLOAT_INTEGRATION=1 uv run pytest tests/test_csfloat_client.py -v -k integration
```

---

## Key numbers

| Constant | Value |
|----------|-------|
| CSFloat buy fee | +2.8% |
| Steam sell fee | 15% |
| Key price | €2.19 |
| Multiplier formula | `(steam / 1.15) / (csf * 1.028)` |

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cases` | All cases ranked by multiplier |
| GET | `/cases/{id}` | Single case |
| POST | `/items` | Add tracked item |
| GET | `/items` | List tracked items |
| GET | `/items/{name}` | Get tracked item by name |
| DELETE | `/items/{name}` | Remove item |
| POST | `/items/{name}/sync` | Sync live prices for one item |
| POST | `/items/sync-all` | Sync all items in background (202) |
| GET | `/deals` | CSFloat deals below ratio |
| GET | `/deals?verify=true` | Deals verified against Steam (slow) |
| GET | `/lookup?name=...` | Steam Market price lookup |
| GET | `/csfloat/listings` | Cheapest CSFloat listing for an item |
| POST | `/scenarios` | Compute buy-order scenario |
| GET | `/scenarios` | List saved scenarios |
| GET | `/scenarios/{file}` | Load saved scenario |
| GET | `/exchange-rate` | Live USD → EUR rate |
| GET | `/rate-limit` | Current Steam rate limit status |
| GET | `/groups` | List item groups |
| POST | `/groups` | Create item group |
| GET | `/groups/{id}` | Get group |
| PATCH | `/groups/{id}` | Update group |
| DELETE | `/groups/{id}` | Delete group |
| POST | `/groups/{id}/sync` | Sync all items in group (202) |
| GET | `/case-openings` | List case opening sessions |
| POST | `/case-openings` | Create session |
| GET | `/inventory` | Cached inventory snapshot (no API call) |
| POST | `/inventory/sync` | Fetch live inventory from Steam ⚠️ burns monthly limit |
| GET | `/case-openings/{id}` | Session detail with ROI stats |
| PATCH | `/case-openings/{id}` | Update session metadata |
| DELETE | `/case-openings/{id}` | Delete session |
| POST | `/case-openings/{id}/items` | Add item to session |
| DELETE | `/case-openings/{id}/items/{index}` | Remove item from session |
| POST | `/case-openings/{id}/items/{index}/sync` | Sync individual item prices |
| POST | `/case-openings/{id}/sync` | Sync all items in session (202) |

---

## Data storage

| Path | Contents |
|------|----------|
| `data/items.json` | Tracked arbitrage items |
| `data/scenarios/` | Saved buy-order scenarios |
| `data/groups.json` | Item groups |
| `data/case_openings/{id}.json` | Case opening sessions (one file per session) |
| `data/inventory.json` | Last Steam inventory snapshot |
