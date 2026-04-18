import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useCases } from "../hooks/useCases";
import { useAddItem } from "../hooks/useItems";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt, multiplierClass, profitClass } from "../utils/format";
import type { ArbitrageItem, CaseType } from "../types/api";

type SortCol = "name" | "csf_price_eur" | "steam_price_eur" | "multiplier" | "profit" | "listings";

function getValue(item: ArbitrageItem, col: SortCol): number | string {
  const ct = item.item_type?.kind === "case" ? (item.item_type as CaseType) : null;
  switch (col) {
    case "name": return item.name;
    case "csf_price_eur": return item.csf_price_eur;
    case "steam_price_eur": return item.steam_price_eur;
    case "multiplier": return item.multiplier;
    case "profit": return item.profit_per_100_eur;
    case "listings": return ct?.num_listings ?? 0;
  }
}

function AddToTrackerButton({ name }: { name: string }) {
  const { mutate, isPending, isSuccess } = useAddItem();
  if (isSuccess) return <span className="text-emerald-400 text-[11px]">Added</span>;
  return (
    <button
      onClick={() => mutate(name)}
      disabled={isPending}
      className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-[11px] transition-colors disabled:opacity-50"
    >
      {isPending ? <Spinner size={10} /> : <Plus size={10} />}
      Track
    </button>
  );
}

export default function Cases() {
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("multiplier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { data: cases, isLoading, isFetching, error, refetch } = useCases();

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const filtered = (cases ?? []).filter((c) =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
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
      {label} {col === sortCol ? (sortDir === "asc" ? "↑" : "↓") : <span className="text-zinc-700">↕</span>}
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-zinc-100">Cases</h1>
        <div className="flex items-center gap-3">
          {cases && (
            <span className="text-xs text-zinc-500">{filtered.length} / {cases.length} cases</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
            Sync CSROI
          </button>
        </div>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name…"
        className="w-64 mb-4 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Spinner /> Loading cases…
        </div>
      )}
      {error && <ErrorBanner message={(error as Error).message} />}

      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-2 py-2 text-left text-zinc-500 font-medium w-8">#</th>
                {th("Name", "name", "text-left")}
                {th("CSF EUR", "csf_price_eur")}
                {th("Steam EUR", "steam_price_eur")}
                {th("Mult", "multiplier")}
                {th("Profit/€100", "profit")}
                {th("Listings", "listings")}
                <th className="px-2 py-2 text-zinc-400 font-medium">Type</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => {
                const ct = item.item_type?.kind === "case" ? (item.item_type as CaseType) : null;
                return (
                  <tr
                    key={item.name}
                    className={[
                      "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                      i % 2 === 1 ? "bg-zinc-900/30" : "",
                    ].join(" ")}
                  >
                    <td className="px-2 py-1.5 text-zinc-600">{i + 1}</td>
                    <td className="px-2 py-1.5 text-left text-zinc-200 max-w-[200px] truncate">{item.name}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.csf_price_eur)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_price_eur)}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(item.multiplier)}`}>
                      {fmt.mult(item.multiplier)}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${profitClass(item.profit_per_100_eur)}`}>
                      {fmt.profit(item.profit_per_100_eur)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.int(ct?.num_listings)}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{ct?.drop_type ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center">
                      <AddToTrackerButton name={item.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
