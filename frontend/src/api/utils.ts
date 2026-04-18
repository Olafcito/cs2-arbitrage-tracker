import { api } from "./client";
import type { ExchangeRate, SteamPrice } from "../types/api";

export const getExchangeRate = () => api.get<ExchangeRate>("/exchange-rate");

export const steamLookup = (name: string) =>
  api.get<SteamPrice>(`/lookup?name=${encodeURIComponent(name)}`);
