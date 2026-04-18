"""Constants and configuration for the CS2 arbitrage tracker."""

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_DIR = Path(__file__).parent.parent
SCENARIOS_DIR = PROJECT_DIR / "scenarios"

# ---------------------------------------------------------------------------
# Fee constants (matching Excel V0 formulas)
# ---------------------------------------------------------------------------

KEY_COST_USD: float = 2.49
KEY_COST_EUR: float = 2.19
STEAM_FEE_DIVISOR: float = 1.15       # steam_net = steam_price / 1.15
CSF_DEPOSIT_MULT: float = 1.028       # csf_total = csf_price * 1.028

# ---------------------------------------------------------------------------
# External URLs
# ---------------------------------------------------------------------------

CSROI_ALL_CASES_URL = "https://csroi.com/pastData/allTrackedCases.json"
CSROI_MARKET_RATIOS_URL = "https://api.csroi.com/marketRatios.json"
FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD&to=EUR"
STEAM_PRICE_OVERVIEW_URL = (
    "https://steamcommunity.com/market/priceoverview/"
    "?appid=730&market_hash_name={name}&currency=3"
)

# ---------------------------------------------------------------------------
# CSFloat
# ---------------------------------------------------------------------------

import os  # noqa: E402

CSFLOAT_API_KEY: str = os.getenv("CSFLOAT_API_KEY", "")
CSFLOAT_BASE_URL: str = "https://csfloat.com/api/v1"
