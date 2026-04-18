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
  updated_at: string;
  market_hash_name: string;
}

export interface Deal {
  name: string;
  csf_price_usd: number;
  csroi_steam_price_usd: number;
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
