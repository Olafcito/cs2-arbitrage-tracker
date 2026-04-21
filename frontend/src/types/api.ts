export interface SteamPrice {
  lowest_price_eur: number | null;
  median_price_eur: number | null;
  volume_24h: number | null;
}

export interface CaseType {
  kind: "case";
  collection_id: number;
  collection_type: string;
  drop_type: string;
  num_listings: number;
  roi_csroi: number;
  profit_prob: number;
}

export interface SkinType {
  kind: "skin";
}

export type ItemType = CaseType | SkinType;

export interface ArbitrageItem {
  name: string;
  csf_price_usd: number;
  steam_price_usd: number;
  csf_price_eur: number;
  steam_price_eur: number;
  csf_cost_with_fee_eur: number;
  steam_net_eur: number;
  multiplier: number;
  profit_per_100_eur: number;
  steam_balance_per_100_eur: number;
  steam_price: SteamPrice | null;
  item_type: ItemType | null;
  created_at: string | null;
  updated_at: string;
  last_synced_at: string | null;
  price_source: "csroi" | "markets";
  market_hash_name: string;
}

export interface Deal {
  name: string;
  csf_price_usd: number;
  csroi_steam_price_usd: number;
  csf_price_eur: number;
  csroi_steam_price_eur: number;
  csroi_ratio: number;
  multiplier: number;
  steam_price: SteamPrice | null;
  liquidity: string;
  verified: boolean;
}

export interface ScenarioAllocation {
  name: string;
  pct: number;
}

export interface ScenarioInput {
  budget_eur: number;
  allocations: ScenarioAllocation[];
  label: string;
}

export interface ScenarioItem {
  name: string;
  pct: number;
  budget_alloc_eur: number;
  csf_price_eur: number;
  steam_price_eur: number;
  quantity: number;
  csf_spend_eur: number;
  spend_with_fee_eur: number;
  steam_proceeds_eur: number;
  keys_raw: number;
}

export interface ScenarioResult {
  label: string;
  budget_eur: number;
  items: ScenarioItem[];
  total_quantity: number;
  total_csf_spend_eur: number;
  total_spend_with_fee_eur: number;
  total_steam_proceeds_eur: number;
  keys_raw: number;
  keys_final: number;
  leftover_steam_eur: number;
}

export interface ScenarioSummary {
  filename: string;
  label: string;
  saved_at: string;
  executed: boolean;
  budget_eur: number;
  keys_final: number;
}

export interface SavedScenario {
  saved_at: string;
  executed: boolean;
  result: ScenarioResult;
}

export interface ExchangeRate {
  rate: number;
}

export interface ItemGroup {
  id: string;
  name: string;
  item_names: string[];
  created_at: string;
}

export interface GroupInput {
  name: string;
  item_names?: string[];
}

export interface GroupPatch {
  name?: string;
  item_names?: string[];
}

export type ItemStatus = "opened" | "for_sale" | "delisted" | "sold";
export type ItemMarketplace = "steam" | "csfloat";

export interface StatusEvent {
  status: ItemStatus;
  marketplace: ItemMarketplace | null;
  sale_price: number | null;
  changed_at: string;
}

export interface CaseOpeningItem {
  id: string;
  name: string;
  wear: string;
  float_value: number | null;
  csf_price_eur: number | null;
  csf_realized_eur: number | null;
  steam_price_eur: number | null;
  item_multiplier: number | null;
  stattrak: boolean;
  rarity: number | null;
  icon_url: string | null;
  status: ItemStatus;
  marketplace: ItemMarketplace | null;
  sale_price: number | null;
  status_updated_at: string;
  status_history: StatusEvent[];
  created_at: string | null;
  last_synced_at: string | null;
}

export interface CaseOpening {
  id: string;
  name: string;
  date: string;
  unbox_price: number;
  multiplier: number;
  items: CaseOpeningItem[];
  created_at: string;
  csf_roi: number | null;
  steam_roi: number | null;
  csf_roi_multiplied: number | null;
  total_csf_value: number | null;
  total_steam_net: number | null;
}

export interface CaseOpeningSummary {
  id: string;
  name: string;
  date: string;
  item_count: number;
  unbox_price: number;
  multiplier: number;
  csf_roi: number | null;
  steam_roi: number | null;
  last_event_at: string;
}

export interface CaseOpeningCreate {
  name: string;
  date: string;
  unbox_price: number;
  multiplier?: number;
}

export interface CaseOpeningPatch {
  name?: string;
  date?: string;
  unbox_price?: number;
  multiplier?: number;
}

export interface CaseOpeningItemInput {
  name: string;
  wear: string;
  float_value?: number | null;
  stattrak?: boolean;
}

export interface CaseOpeningItemStatusPatch {
  status: ItemStatus;
  marketplace: ItemMarketplace | null;
  sale_price?: number | null;
}

export interface FloatInfo {
  floatvalue: number | null;
  paintseed: number | null;
  phase: string | null;
  isstattrak: boolean;
  issouvenir: boolean;
}

export interface InventoryItem {
  id: string;
  assetid: string;
  markethashname: string;
  image: string | null;

  // Pricing (USD)
  pricelatest: number | null;
  pricemix: number | null;
  pricereal: number | null;
  buyorderprice: number | null;
  pricemedian: number | null;

  // Market volume
  sold7d: number | null;
  sold30d: number | null;
  offervolume: number | null;

  // Wear / quality — float is a nested object
  float_info: FloatInfo | null;
  rarity: string | null;
  color: string | null;    // hex rarity colour from API, e.g. "d32ce6"
  quality: string | null;
  wear: string | null;     // abbreviated: fn/mw/ft/ww/bs

  // Identity
  isstattrak: boolean;
  issouvenir: boolean;

  // Trade status
  tradable: boolean;
  tradelocked: boolean;
  markettradablerestriction: number;  // days until tradeable
  marketable: boolean;

  // Timestamps
  firstseenat: string | null;   // ISO datetime — acquired at
}

export interface InventorySnapshot {
  fetched_at: string;
  steam_id: string;
  item_count: number;
  items: InventoryItem[];
}

export interface InventoryUsage {
  month: string;
  syncs_this_month: number;
  syncs_remaining: number;
  monthly_limit: number;
  last_sync_at: string | null;
}

export interface InventoryResponse {
  snapshot: InventorySnapshot | null;
  usage: InventoryUsage;
}
