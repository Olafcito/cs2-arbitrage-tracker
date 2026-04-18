import { api } from "./client";
import type { ArbitrageItem } from "../types/api";

export const getItems = () => api.get<ArbitrageItem[]>("/items");

export const addItem = (name: string) =>
  api.post<ArbitrageItem>("/items", { name });

export const deleteItem = (name: string) =>
  api.delete(`/items/${encodeURIComponent(name)}`);

export const syncItem = (name: string) =>
  api.post<ArbitrageItem>(`/items/${encodeURIComponent(name)}/sync`, {});

export const syncAllItems = () =>
  api.post<{ message: string; item_count: number }>("/items/sync-all", {});
