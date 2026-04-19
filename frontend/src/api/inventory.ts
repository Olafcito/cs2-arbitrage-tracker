import { api } from "./client";
import type { InventoryResponse } from "../types/api";

export const getInventory = () => api.get<InventoryResponse>("/inventory");
export const syncInventory = () => api.post<InventoryResponse>("/inventory/sync", {});
