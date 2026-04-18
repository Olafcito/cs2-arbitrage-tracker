import { api } from "./client";
import type { ArbitrageItem } from "../types/api";

export const getCases = (names?: string[]) => {
  const qs = names?.length ? `?names=${names.join(",")}` : "";
  return api.get<ArbitrageItem[]>(`/cases${qs}`);
};
