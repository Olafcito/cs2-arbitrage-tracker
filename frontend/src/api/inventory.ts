import { api } from "./client";
import type { InventorySnapshot } from "../types/api";

export const getInventory = () => api.get<InventorySnapshot>("/inventory");
export const syncInventory = () => api.post<InventorySnapshot>("/inventory/sync", {});
