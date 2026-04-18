import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useDeals } from "../hooks/useDeals";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import Badge from "../components/ui/Badge";
import { fmt, liquidityClass, multiplierClass } from "../utils/format";

export default function Deals() {
  const [maxRatio, setMaxRatio] = useState(0.6);
  const [verify, setVerify] = useState(false);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isFetching, error, refetch } = useDeals({
    max_ratio: maxRatio,
    verify,
    limit,
  });

  const liquidityBadgeClass = (l: string) => {
    switch (l) {
      case "high": return "bg-emerald-950 text-emerald-400";
      case "medium": return "bg-amber-950 text-amber-400";
      case "low": return "bg-red-950 text-red-400";
      default: return "bg-zinc-800 text-zinc-500";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-zinc-100">Deals</h1>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
          Sync CSROI
        </button>
      </div>

      <div className="flex flex-wrap gap-6 mb-4 p-3 bg-zinc-900 rounded border border-zinc-800">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Max ratio: <span className="text-zinc-200">{maxRatio.toFixed(2)}</span></label>
          <input
            type="range"
            min="0.3"
            max="0.8"
            step="0.01"
            value={maxRatio}
            onChange={(e) => setMaxRatio(parseFloat(e.target.value))}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min="1"
            max="100"
            className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-emerald-600"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Verify vs Steam</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={verify}
              onChange={(e) => setVerify(e.target.checked)}
              className="accent-emerald-500"
            />
            <span className="text-xs text-zinc-300">Enable</span>
          </label>
        </div>
      </div>

      {verify && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-amber-950/50 border border-amber-800 text-amber-300 text-xs">
          <AlertTriangle size={12} className="shrink-0" />
          Verification hits Steam API — rate-limited, may take 30–120s.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Spinner /> {verify ? "Verifying against Steam (this may take a while)…" : "Loading deals…"}
        </div>
      )}

      {error && <ErrorBanner message={(error as Error).message} />}

      {data && data.length === 0 && (
        <p className="text-zinc-600 text-xs">No deals found at this ratio.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">#</th>
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Name</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSF EUR</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam EUR</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Ratio</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Mult</th>
                {verify && <th className="px-2 py-2 text-right text-zinc-400 font-medium">Vol</th>}
                <th className="px-2 py-2 text-zinc-400 font-medium">Liquidity</th>
                {verify && <th className="px-2 py-2 text-zinc-400 font-medium">Verified</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((deal, i) => {
                const steamEur = deal.verified && deal.steam_price?.lowest_price_eur != null
                  ? deal.steam_price.lowest_price_eur
                  : deal.csroi_steam_price_eur;
                return (
                  <tr
                    key={deal.name}
                    className={[
                      "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                      i % 2 === 1 ? "bg-zinc-900/30" : "",
                    ].join(" ")}
                  >
                    <td className="px-2 py-1.5 text-zinc-600">{i + 1}</td>
                    <td className="px-2 py-1.5 text-left text-zinc-200 max-w-[200px] truncate">{deal.name}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(deal.csf_price_eur)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(steamEur)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.ratio(deal.csroi_ratio)}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(deal.multiplier)}`}>
                      {fmt.mult(deal.multiplier)}
                    </td>
                    {verify && (
                      <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.int(deal.steam_price?.volume_24h)}</td>
                    )}
                    <td className="px-2 py-1.5">
                      <Badge
                        label={deal.liquidity}
                        className={liquidityBadgeClass(deal.liquidity)}
                      />
                    </td>
                    {verify && (
                      <td className="px-2 py-1.5 text-center">
                        <span className={deal.verified ? liquidityClass("high") : "text-zinc-600"}>
                          {deal.verified ? "✓" : "—"}
                        </span>
                      </td>
                    )}
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
