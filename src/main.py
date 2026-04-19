"""CS2 Arbitrage Tracker — FastAPI application."""

import logging
import logging.config

import requests
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse

from src.utils import fetch_exchange_rate
from src.routers import case_openings, cases, csfloat, deals, groups, items, lookup, scenarios
from src.services.steam import get_rate_limit_status, SteamRateLimitError

# ---------------------------------------------------------------------------
# Logging — simple console output with timestamps
# ---------------------------------------------------------------------------

logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s %(levelname)-8s %(name)s — %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        }
    },
    "root": {"level": "INFO", "handlers": ["console"]},
    "loggers": {
        "src": {"level": "DEBUG", "propagate": True},
        "uvicorn.access": {"level": "WARNING", "propagate": True},
    },
})

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CS2 Arbitrage Tracker",
    description="API for tracking CS2 case and item arbitrage between CSFloat and Steam.",
    version="0.5.0",
)

app.include_router(case_openings.router)
app.include_router(cases.router)
app.include_router(csfloat.router)
app.include_router(deals.router)
app.include_router(groups.router)
app.include_router(items.router)
app.include_router(lookup.router)
app.include_router(scenarios.router)


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(SteamRateLimitError)
async def steam_rate_limit_handler(request: Request, exc: SteamRateLimitError) -> JSONResponse:
    logger.warning("Steam rate limit hit on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=429, content={"detail": str(exc)})


@app.exception_handler(requests.HTTPError)
async def http_error_handler(request: Request, exc: requests.HTTPError) -> JSONResponse:
    status = exc.response.status_code if exc.response is not None else 502
    logger.error("Upstream HTTP error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=status, content={"detail": f"Upstream error: {exc}"})


@app.exception_handler(requests.ConnectionError)
async def connection_error_handler(request: Request, exc: requests.ConnectionError) -> JSONResponse:
    logger.error("Connection error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "External service unavailable — check network"})


@app.exception_handler(requests.Timeout)
async def timeout_handler(request: Request, exc: requests.Timeout) -> JSONResponse:
    logger.error("Timeout on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=504, content={"detail": "External service timed out"})


# ---------------------------------------------------------------------------
# Utility endpoints
# ---------------------------------------------------------------------------

utility_router = APIRouter(tags=["Utility"])


@utility_router.get("/exchange-rate")
def exchange_rate() -> dict:
    """Current USD to EUR exchange rate."""
    rate = fetch_exchange_rate()
    return {"rate": rate}


@utility_router.get("/rate-limit")
def rate_limit_status() -> dict:
    """Current Steam API rate limit status."""
    return get_rate_limit_status()


app.include_router(utility_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
