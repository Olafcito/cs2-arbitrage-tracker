# CS2 Arbitrage Tracker

Buy CS2 items cheap on CSFloat, sell on Steam, accumulate balance for keys. This repo contains a FastAPI backend, React frontend, and FastMCP server for Claude integration.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python · FastAPI · Pydantic v2 · uv |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query |
| MCP | FastMCP (stdio for Claude Desktop, HTTP for remote) |

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager
- Node.js 18+ / npm

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
cd frontend
npm install        # first time only
npm run dev
# → http://localhost:5173
```

Vite proxies `/api/*` to `localhost:8000`, so no CORS setup needed.

### 3. MCP server (Claude Desktop)

The MCP server is launched automatically by Claude Desktop — no manual start needed.

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

#### MCP tools available

| Tool | Description |
|------|-------------|
| `lookup_item` | CSFloat + Steam prices for any item |
| `list_deals` | Top CSFloat deals below a ratio threshold |
| `list_tracked` | Your tracked items with live arbitrage metrics |
| `add_to_tracker` | Add an item to the tracked list |

Accepts tab-separated inventory format: `Glock-18 | Warhawk\tMinimal Wear\t0.13`

#### HTTP mode (remote / ngrok / Cloudflare Tunnel)

```bash
uv run mcp_server.py --http
# → port 8001
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
| DELETE | `/items/{name}` | Remove item |
| GET | `/deals` | CSFloat deals below ratio |
| GET | `/deals?verify=true` | Deals verified against Steam (slow) |
| GET | `/lookup?name=...` | Steam Market price lookup |
| POST | `/scenarios` | Compute buy-order scenario |
| GET | `/scenarios` | List saved scenarios |
| GET | `/exchange-rate` | Live USD → EUR rate |

---

## Data storage

Tracked items persist to `data/items.json`. Scenarios persist to `data/scenarios/`.
