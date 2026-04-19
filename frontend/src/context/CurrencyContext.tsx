import { createContext, useContext, useState } from "react";

export type Currency = "EUR" | "USD";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Convert an EUR value to the selected currency using the live rate */
  convert: (eur: number | null | undefined, rate: number) => number | null;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "EUR",
  setCurrency: () => {},
  convert: (eur) => eur ?? null,
  symbol: "€",
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("EUR");

  const convert = (eur: number | null | undefined, rate: number): number | null => {
    if (eur == null) return null;
    return currency === "EUR" ? eur : eur / rate;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, symbol: currency === "EUR" ? "€" : "$" }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
