import { api } from "./client";
import type { Deal } from "../types/api";

export interface DealsParams {
  max_ratio?: number;
  verify?: boolean;
  limit?: number;
}

export const getDeals = (params?: DealsParams) => {
  const p = new URLSearchParams();
  if (params?.max_ratio != null) p.set("max_ratio", String(params.max_ratio));
  if (params?.verify != null) p.set("verify", String(params.verify));
  if (params?.limit != null) p.set("limit", String(params.limit));
  const qs = p.toString() ? `?${p}` : "";
  return api.get<Deal[]>(`/deals${qs}`);
};
