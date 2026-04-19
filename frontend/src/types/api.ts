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

export interface InventoryItem {
  assetid: string;
  markethashname: string;
  image: string | null;
  float_value: number | null;
  rarity: string | null;
  phase: string | null;
  tradeable: boolean;
  tradable_date: string | null;
  acquired_at: string | null;
  pricelatest: number | null;
  pricemix: number | null;
  buyorderprice: number | null;
  stickers: unknown[];
  keychains: unknown[];
}

export interface InventorySnapshot {
  fetched_at: string;
  steam_id: string;
  item_count: number;
  items: InventoryItem[];
}
