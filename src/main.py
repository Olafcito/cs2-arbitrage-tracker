"""CS2 Arbitrage Tracker — FastAPI application."""

from fastapi import APIRouter, FastAPI

from src.utils import fetch_exchange_rate
from src.routers import cases, deals, items, lookup, scenarios

app = FastAPI(
    title="CS2 Arbitrage Tracker",
    description="API for tracking CS2 case and item arbitrage between CSFloat and Steam.",
    version="0.3.0",
)

app.include_router(cases.router)
app.include_router(deals.router)
app.include_router(items.router)
app.include_router(lookup.router)
app.include_router(scenarios.router)


# --- Utility endpoints ---

utility_router = APIRouter(tags=["Utility"])


@utility_router.get("/exchange-rate")
def exchange_rate() -> dict:
    """Current USD to EUR exchange rate."""
    rate = fetch_exchange_rate()
    return {"rate": rate}


app.include_router(utility_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
