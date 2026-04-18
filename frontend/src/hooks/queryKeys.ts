import type { DealsParams } from "../api/deals";

export const queryKeys = {
  items: ["items"] as const,
  cases: (names?: string[]) => ["cases", names ?? []] as const,
  deals: (params: DealsParams) => ["deals", params] as const,
  scenarios: ["scenarios"] as const,
  scenario: (filename: string) => ["scenario", filename] as const,
  exchangeRate: ["exchangeRate"] as const,
};
