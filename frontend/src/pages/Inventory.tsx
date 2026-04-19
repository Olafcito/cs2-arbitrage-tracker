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

const WEAR_LABELS: Record<string, string> = {
  fn: "Factory New",
  mw: "Minimal Wear",
  ft: "Field-Tested",
  ww: "Well-Worn",
  bs: "Battle-Scarred",
};

type SortCol =
  | "markethashname" | "float_value" | "rarity"
  | "tradable" | "firstseenat"
  | "pricelatest" | "pricereal" | "sold7d";

function colValue(item: InventoryItem, col: SortCol): number | string {
  switch (col) {
    case "markethashname": return item.markethashname;
    case "float_value": return item.float_info?.floatvalue ?? -1;
    case "rarity": return item.rarity ?? "";
    case "tradable": return item.tradable ? 1 : 0;
    case "firstseenat": return item.firstseenat ?? "";
    case "pricelatest": return item.pricelatest ?? -1;
    case "pricereal": return item.pricereal ?? -1;
    case "sold7d": return item.sold7d ?? -1;
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

function TradeCell({ item }: { item: InventoryItem }) {
  if (item.tradable) return <span className="text-[13px]">✅</span>;
  if (item.tradelocked && item.markettradablerestriction > 0) {
    return (
      <span className="text-[10px] text-amber-400 whitespace-nowrap">
        🔒 {item.markettradablerestriction}d
      </span>
    );
  }
  return <span className="text-[13px]">🔒</span>;
}

function ItemRow({ item, symbol, cv }: {
  item: InventoryItem;
  symbol: string;
  cv: (v: number | null | undefined) => number | null;
}) {
  const floatVal = item.float_info?.floatvalue;
  const color = item.color ? `#${item.color}` : undefined;

  return (
    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
      <td className="px-2 py-1.5 w-10">
        {item.image ? (
          <img src={item.image} alt="" className="w-8 h-8 object-contain" loading="lazy" />
        ) : (
          <div className="w-8 h-8 bg-zinc-800 rounded" />
        )}
      </td>
      <td className="px-2 py-1.5 max-w-[220px]">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            {item.isstattrak && (
              <span className="shrink-0 px-1 py-0.5 rounded text-[9px] bg-amber-900/50 text-amber-400 border border-amber-800 leading-none">ST™</span>
            )}
            {item.issouvenir && (
              <span className="shrink-0 px-1 py-0.5 rounded text-[9px] bg-yellow-900/50 text-yellow-400 border border-yellow-800 leading-none">SV</span>
            )}
            <span
              className="truncate text-xs font-medium"
              style={{ color }}
              title={item.markethashname}
            >
              {item.markethashname}
            </span>
          </div>
          {item.float_info?.phase && (
            <span className="text-[10px] text-amber-400">{item.float_info.phase}</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-400 text-xs">
        {floatVal != null ? floatVal.toFixed(4) : "—"}
      </td>
      <td className="px-2 py-1.5 text-xs whitespace-nowrap" style={{ color }}>
        {item.rarity ?? "—"}
      </td>
      <td className="px-2 py-1.5 text-xs text-zinc-500 whitespace-nowrap">
        {item.wear ? (WEAR_LABELS[item.wear] ?? item.wear) : "—"}
      </td>
      <td className="px-2 py-1.5 text-center">
        <TradeCell item={item} />
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px] whitespace-nowrap">
        {item.firstseenat ? relativeTime(item.firstseenat) : "—"}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-300 text-xs">
        {fmt.cur(cv(item.pricelatest), symbol)}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-400 text-xs">
        {fmt.cur(cv(item.pricereal), symbol)}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-xs">
        {item.sold7d ?? "—"}
      </td>
    </tr>
  );
}

export default function Inventory() {
  const { data, isLoading, error } = useInventory();
  const sync = useSyncInventory();

  const { convert, symbol } = useCurrency();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate ?? 1;
  const cv = (v: number | null | undefined) => convert(v, rate);

  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("markethashname");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showConfirm, setShowConfirm] = useState(false);

  const snapshot = data?.snapshot ?? null;
  const usage = data?.usage;

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

  const tradeableCount = items.filter((i) => i.tradable).length;
  const canSync = !usage || usage.syncs_remaining > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-zinc-100">Steam Inventory</h1>
          {usage && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${
              usage.syncs_remaining === 0
                ? "border-red-800 text-red-400 bg-red-900/20"
                : usage.syncs_remaining <= 2
                ? "border-amber-800 text-amber-400 bg-amber-900/20"
                : "border-zinc-700 text-zinc-500"
            }`}>
              {usage.syncs_remaining}/{usage.monthly_limit} syncs left
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {snapshot && (
            <span className="text-xs text-zinc-500">
              synced {relativeTime(snapshot.fetched_at)}
            </span>
          )}
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSync || sync.isPending}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={sync.isPending ? "animate-spin" : ""} />
              {sync.isPending ? "Syncing…" : "Sync Inventory"}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-amber-700 bg-amber-900/20">
              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
              <span className="text-amber-300">Burns monthly limit</span>
              <button
                onClick={() => { sync.mutate(); setShowConfirm(false); }}
                disabled={sync.isPending}
                className="ml-1 px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-[11px] disabled:opacity-50 flex items-center gap-1"
              >
                {sync.isPending ? <><Spinner size={10} /> Syncing…</> : "Confirm"}
              </button>
              <button onClick={() => setShowConfirm(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>
          )}
        </div>
      </div>

      {sync.isError && (
        <div className="mb-3">
          <ErrorBanner message={(sync.error as Error)?.message ?? "Sync failed"} />
        </div>
      )}

      {isLoading && <div className="flex items-center gap-2 text-zinc-500 text-xs"><Spinner /> Loading…</div>}

      {!isLoading && !snapshot && (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-sm mb-1">No inventory snapshot yet.</p>
          <p className="text-xs">Use Sync Inventory above to fetch from Steam.</p>
          <p className="text-xs mt-1 text-zinc-600">Free tier: 5 syncs/month — use sparingly.</p>
        </div>
      )}

      {snapshot && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatCard label="Items" value={String(snapshot.item_count)} />
            <StatCard label="Tradeable" value={`${tradeableCount} / ${snapshot.item_count}`} />
            <StatCard
              label={`Total Steam (${symbol})`}
              value={fmt.cur(cv(items.reduce((s, i) => s + (i.pricelatest ?? 0), 0)), symbol)}
            />
            <StatCard
              label={`Total Market (${symbol})`}
              value={fmt.cur(cv(items.reduce((s, i) => s + (i.pricereal ?? 0), 0)), symbol)}
            />
          </div>

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

          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-2 py-2 w-10" />
                  {thSort("Item", "markethashname", "text-left")}
                  {thSort("Float", "float_value")}
                  {thSort("Rarity", "rarity", "text-left")}
                  <th className="px-2 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">Wear</th>
                  {thSort("Trade", "tradable")}
                  {thSort("Acquired", "firstseenat")}
                  {thSort(`Steam (${symbol})`, "pricelatest")}
                  {thSort(`Market (${symbol})`, "pricereal")}
                  {thSort("7d Vol", "sold7d")}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <ItemRow key={item.assetid} item={item} symbol={symbol} cv={cv} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
