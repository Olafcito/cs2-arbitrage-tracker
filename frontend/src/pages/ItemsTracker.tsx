import { useState } from "react";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useDeleteItem, useItems, useSyncAllItems, useSyncItem } from "../hooks/useItems";
import AddItemForm from "../components/forms/AddItemForm";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt, multiplierClass, relativeTime } from "../utils/format";
import { useCurrency } from "../context/CurrencyContext";
import { useExchangeRate } from "../hooks/useExchangeRate";
import type { ArbitrageItem } from "../types/api";

type SortCol =
  | "name"
  | "csf_price_eur"
  | "csf_cost_with_fee_eur"
  | "steam_price_eur"
  | "lowest"
  | "median"
  | "volume"
  | "multiplier"
  | "last_synced_at";

function getValue(item: ArbitrageItem, col: SortCol): number | string {
  switch (col) {
    case "name": return item.name;
    case "csf_price_eur": return item.csf_price_eur;
    case "csf_cost_with_fee_eur": return item.csf_cost_with_fee_eur;
    case "steam_price_eur": return item.steam_price_eur;
    case "lowest": return item.steam_price?.lowest_price_eur ?? -1;
    case "median": return item.steam_price?.median_price_eur ?? -1;
    case "volume": return item.steam_price?.volume_24h ?? -1;
    case "multiplier": return item.multiplier;
    case "last_synced_at": return item.last_synced_at ?? "";
  }
}

function SortIndicator({ col, active, dir }: { col: string; active: string; dir: "asc" | "desc" }) {
  if (col !== active) return <span className="text-zinc-700 ml-1">↕</span>;
  return <span className="text-emerald-400 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function SyncButton({ name }: { name: string }) {
  const { mutate, isPending, error } = useSyncItem();
  const is429 = error && (error as { status?: number }).status === 429;
  return (
    <button
      onClick={() => mutate(name)}
      disabled={isPending}
      title={is429 ? (error as Error).message : "Sync live prices"}
      className={`p-1 disabled:opacity-40 transition-colors ${is429 ? "text-amber-500" : "text-zinc-600 hover:text-emerald-400"}`}
    >
      <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
    </button>
  );
}

function DeleteButton({ name }: { name: string }) {
  const { mutate, isPending } = useDeleteItem();
  return (
    <button
      onClick={() => mutate(name)}
      disabled={isPending}
      className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
    >
      {isPending ? <Spinner size={12} /> : <Trash2 size={12} />}
    </button>
  );
}

function SourceBadge({ source }: { source: "csroi" | "markets" }) {
  return source === "markets"
    ? <span className="px-1 py-0.5 rounded text-[10px] bg-emerald-900/50 text-emerald-400 border border-emerald-800">Live</span>
    : <span className="px-1 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">CSROI</span>;
}

export default function ItemsTracker() {
  const { data: items, isLoading, error } = useItems();
  const syncAll = useSyncAllItems();
  const { convert, symbol } = useCurrency();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate ?? 1;
  const cv = (v: number | null | undefined) => convert(v, rate);

  const [sortCol, setSortCol] = useState<SortCol>("multiplier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sorted = [...(items ?? [])].sort((a, b) => {
    const av = getValue(a, sortCol);
    const bv = getValue(b, sortCol);
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const th = (label: string, col: SortCol, align = "text-right") => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-2 py-2 ${align} text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap`}
    >
      {label}
      <SortIndicator col={col} active={sortCol} dir={sortDir} />
    </th>
  );

  const handleSyncAll = () => {
    setRateLimitMsg(null);
    syncAll.mutate(undefined, {
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        if (e.status === 429) setRateLimitMsg(e.message ?? "Steam rate limit hit");
      },
    });
  };

  return (
    <div>
      <div className="mb-4 rounded border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-400 leading-relaxed">
        <span className="font-semibold text-zinc-200">Items Tracker</span> — track and monitor arbitrage for any CS2 item.
        Enter the exact Steam market hash name (e.g. <span className="text-zinc-300 font-mono">AK-47 | Redline (Field-Tested)</span>).
        Prices are fetched directly from the <span className="text-zinc-300">CSFloat API</span> and <span className="text-zinc-300">Steam Market</span> — no dependency on CSROI.
        CSROI data is only used in the <span className="text-zinc-300">Cases</span> section.
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-zinc-100">Items Tracker</h1>
        <button
          onClick={handleSyncAll}
          disabled={syncAll.isSyncing}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={11} className={syncAll.isSyncing ? "animate-spin" : ""} />
          {syncAll.isSyncing ? "Syncing…" : "Sync All"}
        </button>
      </div>
      <AddItemForm />
      {rateLimitMsg && (
        <div className="mt-2">
          <ErrorBanner variant="rateLimit" message={rateLimitMsg} onDismiss={() => setRateLimitMsg(null)} />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs mt-4">
          <Spinner /> Loading…
        </div>
      )}

      {error && <ErrorBanner message={(error as Error).message} />}

      {!isLoading && sorted.length === 0 && !error && (
        <p className="text-zinc-600 text-xs mt-6">No items tracked yet. Add one above.</p>
      )}

      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                {th("Name", "name", "text-left")}
                {th(`CSF`, "csf_price_eur")}
                {th("+Fee", "csf_cost_with_fee_eur")}
                {th("Steam", "steam_price_eur")}
                {th("Low", "lowest")}
                {th("Med", "median")}
                {th("Vol 24h", "volume")}
                {th("Mult", "multiplier")}
                {th("Last Synced", "last_synced_at", "text-left")}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr
                  key={item.name}
                  className={[
                    "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                    i % 2 === 1 ? "bg-zinc-900/30" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-1.5 text-left max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://steamcommunity.com/market/listings/730/${item.market_hash_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-200 hover:text-emerald-400 truncate transition-colors"
                        title={item.name}
                      >
                        {item.name}
                      </a>
                      <ExternalLink size={10} className="text-zinc-600 shrink-0" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.cur(cv(item.csf_price_eur), symbol)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.cur(cv(item.csf_cost_with_fee_eur), symbol)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.cur(cv(item.steam_price_eur), symbol)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.cur(cv(item.steam_price?.lowest_price_eur), symbol)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.cur(cv(item.steam_price?.median_price_eur), symbol)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.int(item.steam_price?.volume_24h)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(item.multiplier)}`}>
                    {fmt.mult(item.multiplier)}
                  </td>
                  <td className="px-2 py-1.5 text-left whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <SourceBadge source={item.price_source} />
                      <span className="text-zinc-600 text-[11px]">
                        {item.last_synced_at ? relativeTime(item.last_synced_at) : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <SyncButton name={item.name} />
                      <DeleteButton name={item.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
