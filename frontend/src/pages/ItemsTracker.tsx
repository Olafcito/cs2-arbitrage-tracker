import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { useDeleteItem, useItems } from "../hooks/useItems";
import AddItemForm from "../components/forms/AddItemForm";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt, multiplierClass, profitClass, relativeTime } from "../utils/format";
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
  | "profit"
  | "balance";

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
    case "profit": return item.profit_per_100_eur;
    case "balance": return item.steam_balance_per_100_eur;
  }
}

function SortIndicator({ col, active, dir }: { col: string; active: string; dir: "asc" | "desc" }) {
  if (col !== active) return <span className="text-zinc-700 ml-1">↕</span>;
  return <span className="text-emerald-400 ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
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

export default function ItemsTracker() {
  const { data: items, isLoading, error } = useItems();
  const [sortCol, setSortCol] = useState<SortCol>("multiplier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  return (
    <div>
      <h1 className="text-sm font-bold text-zinc-100 mb-4">Items Tracker</h1>
      <AddItemForm />

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs mt-4">
          <Spinner /> Loading…
        </div>
      )}

      {error && (
        <ErrorBanner message={(error as Error).message} />
      )}

      {!isLoading && sorted.length === 0 && !error && (
        <p className="text-zinc-600 text-xs mt-6">
          No items tracked yet. Add one above.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                {th("Name", "name", "text-left")}
                {th("CSF EUR", "csf_price_eur")}
                {th("+Fee", "csf_cost_with_fee_eur")}
                {th("Steam EUR", "steam_price_eur")}
                {th("Low EUR", "lowest")}
                {th("Med EUR", "median")}
                {th("Vol 24h", "volume")}
                {th("Mult", "multiplier")}
                {th("Profit/€100", "profit")}
                {th("Bal/€100", "balance")}
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
                    <div className="text-zinc-600 text-[11px]">{relativeTime(item.updated_at)}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.csf_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.csf_cost_with_fee_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_price?.lowest_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.steam_price?.median_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.int(item.steam_price?.volume_24h)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(item.multiplier)}`}>
                    {fmt.mult(item.multiplier)}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${profitClass(item.profit_per_100_eur)}`}>
                    {fmt.profit(item.profit_per_100_eur)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_balance_per_100_eur)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <DeleteButton name={item.name} />
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
