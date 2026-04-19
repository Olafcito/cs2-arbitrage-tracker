import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useInventory, useSyncInventory } from "../hooks/useInventory";
import { useCurrency } from "../context/CurrencyContext";
import { useExchangeRate } from "../hooks/useExchangeRate";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import StatCard from "../components/ui/StatCard";
import { fmt, relativeTime } from "../utils/format";
import type { InventoryItem } from "../types/api";

// CS2 rarity string → exact Steam color
const RARITY_COLORS: Record<string, string> = {
  "Consumer Grade": "#b0c3d9",
  "Industrial Grade": "#5e98d9",
  "Mil-Spec Grade": "#4b69ff",
  "Mil-Spec": "#4b69ff",
  Restricted: "#8847ff",
  Classified: "#d32ce6",
  Covert: "#eb4b4b",
  Extraordinary: "#e4ae39",
  Contraband: "#e4ae39",
  "Base Grade": "#b0c3d9",
  "High Grade": "#4b69ff",
  Remarkable: "#8847ff",
  Exotic: "#d32ce6",
  Extraordinary_knife: "#e4ae39",
};

function rarityColor(rarity: string | null): string | undefined {
  if (!rarity) return undefined;
  return RARITY_COLORS[rarity] ?? "#b0c3d9";
}

type SortCol =
  | "markethashname" | "float_value" | "rarity"
  | "tradeable" | "tradable_date" | "acquired_at"
  | "pricelatest" | "pricemix";

function colValue(item: InventoryItem, col: SortCol): number | string {
  switch (col) {
    case "markethashname": return item.markethashname;
    case "float_value": return item.float_value ?? -1;
    case "rarity": return item.rarity ?? "";
    case "tradeable": return item.tradeable ? 1 : 0;
    case "tradable_date": return item.tradable_date ?? "";
    case "acquired_at": return item.acquired_at ?? "";
    case "pricelatest": return item.pricelatest ?? -1;
    case "pricemix": return item.pricemix ?? -1;
  }
}

function SortTh({ label, col, active, dir, onToggle, align = "text-right" }: {
  label: string; col: SortCol; active: SortCol; dir: "asc" | "desc";
  onToggle: (c: SortCol) => void; align?: string;
}) {
  return (
    <th
      onClick={() => onToggle(col)}
      className={`px-2 py-2 ${align} text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap`}
    >
      {label}
      <span className={`ml-1 ${col === active ? "text-emerald-400" : "text-zinc-700"}`}>
        {col === active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

function ItemRow({ item, symbol, cv }: {
  item: InventoryItem;
  symbol: string;
  cv: (v: number | null | undefined) => number | null;
}) {
  const tradeable = item.tradeable;
  const tradeableDate = item.tradable_date;

  return (
    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
      <td className="px-2 py-1.5">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="w-8 h-8 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 bg-zinc-800 rounded" />
        )}
      </td>
      <td className="px-2 py-1.5 max-w-[220px]">
        <div className="flex flex-col min-w-0">
          <span
            className="truncate text-xs font-medium"
            style={{ color: rarityColor(item.rarity) }}
            title={item.markethashname}
          >
            {item.markethashname}
          </span>
          {item.phase && (
            <span className="text-[10px] text-amber-400">{item.phase}</span>
          )}
          {item.stickers.length > 0 && (
            <span className="text-[10px] text-zinc-500">{item.stickers.length} sticker{item.stickers.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-400 text-xs">
        {item.float_value != null ? item.float_value.toFixed(4) : "—"}
      </td>
      <td className="px-2 py-1.5 text-xs" style={{ color: rarityColor(item.rarity) }}>
        {item.rarity ?? "—"}
      </td>
      <td className="px-2 py-1.5 text-center text-[13px]">
        {tradeable ? "✅" : tradeableDate ? (
          <span className="text-[10px] text-amber-400 whitespace-nowrap">
            {tradeableDate}
          </span>
        ) : "🔒"}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px] whitespace-nowrap">
        {item.acquired_at ? relativeTime(item.acquired_at) : "—"}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-300 text-xs">
        {fmt.cur(cv(item.pricelatest), symbol)}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-400 text-xs">
        {fmt.cur(cv(item.pricemix), symbol)}
      </td>
    </tr>
  );
}

export default function Inventory() {
  const { data: snapshot, isLoading, error } = useInventory();
  const sync = useSyncInventory();

  const { convert, symbol } = useCurrency();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate ?? 1;
  const cv = (v: number | null | undefined) => convert(v, rate);

  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("markethashname");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const thSort = (label: string, col: SortCol, align?: string) => (
    <SortTh label={label} col={col} active={sortCol} dir={sortDir} onToggle={toggleSort} align={align} />
  );

  const items = snapshot?.items ?? [];
  const filtered = filter
    ? items.filter((i) => i.markethashname.toLowerCase().includes(filter.toLowerCase()))
    : items;
  const sorted = [...filtered].sort((a, b) => {
    const av = colValue(a, sortCol);
    const bv = colValue(b, sortCol);
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const tradeableCount = items.filter((i) => i.tradeable).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-zinc-100">Steam Inventory</h1>
        <div className="flex items-center gap-2">
          {snapshot && (
            <span className="text-xs text-zinc-500">
              synced {relativeTime(snapshot.fetched_at)}
            </span>
          )}
          {!showSyncWarning ? (
            <button
              onClick={() => setShowSyncWarning(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              <RefreshCw size={11} />
              Sync Inventory
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-amber-700 bg-amber-900/20">
              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              <span className="text-amber-300">Burns monthly limit (5/mo)</span>
              <button
                onClick={() => { sync.mutate(); setShowSyncWarning(false); }}
                disabled={sync.isPending}
                className="ml-1 px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-[11px] disabled:opacity-50"
              >
                {sync.isPending ? <Spinner size={10} /> : "Confirm"}
              </button>
              <button
                onClick={() => setShowSyncWarning(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {sync.isError && (
        <div className="mb-3">
          <ErrorBanner message={(sync.error as Error)?.message ?? "Sync failed"} />
        </div>
      )}

      {/* No snapshot yet */}
      {!isLoading && (error || !snapshot) && (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-sm mb-1">No inventory snapshot yet.</p>
          <p className="text-xs">Use Sync Inventory above to fetch from Steam.</p>
          <p className="text-xs mt-1 text-zinc-600">Free tier: 5 syncs/month — use sparingly.</p>
        </div>
      )}

      {isLoading && <div className="flex items-center gap-2 text-zinc-500 text-xs"><Spinner /> Loading…</div>}

      {snapshot && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatCard label="Items" value={String(snapshot.item_count)} />
            <StatCard label="Tradeable" value={`${tradeableCount} / ${snapshot.item_count}`} />
            <StatCard
              label={`Total Value (${symbol})`}
              value={fmt.cur(
                cv(items.reduce((s, i) => s + (i.pricelatest ?? 0), 0)),
                symbol,
              )}
            />
            <StatCard label="Steam ID" value={snapshot.steam_id.slice(-6)} />
          </div>

          {/* Filter */}
          <div className="mb-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter items…"
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-48"
            />
            {filter && (
              <span className="ml-2 text-[11px] text-zinc-500">{sorted.length} / {items.length}</span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-2 py-2 w-10" />
                  {thSort("Item", "markethashname", "text-left")}
                  {thSort("Float", "float_value")}
                  {thSort("Rarity", "rarity", "text-left")}
                  {thSort("Trade", "tradeable")}
                  {thSort("Acquired", "acquired_at")}
                  {thSort(`Latest (${symbol})`, "pricelatest")}
                  {thSort(`Mix (${symbol})`, "pricemix")}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <ItemRow
                    key={item.assetid}
                    item={item}
                    symbol={symbol}
                    cv={cv}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
