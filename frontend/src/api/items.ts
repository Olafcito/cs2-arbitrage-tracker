import { api } from "./client";
import type { ArbitrageItem } from "../types/api";

export const getItems = () => api.get<ArbitrageItem[]>("/items");

export const addItem = (name: string) =>
  api.post<ArbitrageItem>("/items", { name });

export const deleteItem = (name: string) =>
  api.delete(`/items/${encodeURIComponent(name)}`);
