import { Link } from "react-router-dom";
import { useItems } from "../hooks/useItems";
import { useExchangeRate } from "../hooks/useExchangeRate";
import StatCard from "../components/ui/StatCard";
import Spinner from "../components/ui/Spinner";
import { fmt, multiplierClass, profitClass } from "../utils/format";

export default function Dashboard() {
  const { data: items, isLoading } = useItems();
  const { data: rate } = useExchangeRate();

  const sorted = [...(items ?? [])].sort((a, b) => b.multiplier - a.multiplier);
  const top5 = sorted.slice(0, 5);
  const avgMult =
    sorted.length > 0
      ? sorted.reduce((s, i) => s + i.multiplier, 0) / sorted.length
      : null;

  return (
    <div>
      <h1 className="text-sm font-bold text-zinc-100 mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <StatCard
          label="Tracked Items"
          value={String(items?.length ?? "—")}
        />
        <StatCard
          label="Best Multiplier"
          value={sorted[0] ? fmt.mult(sorted[0].multiplier) : "—"}
          sub={sorted[0]?.name}
          accent
        />
        <StatCard
          label="Avg Multiplier"
          value={avgMult != null ? fmt.mult(avgMult) : "—"}
        />
        <StatCard
          label="USD → EUR"
          value={rate ? `${rate.rate.toFixed(5)}` : "—"}
          sub="live rate"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Spinner /> Loading…
        </div>
      )}

      {top5.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Top Items by Multiplier
            </h2>
            <Link to="/items" className="text-xs text-emerald-600 hover:text-emerald-400">
              View all →
            </Link>
          </div>
          <div className="rounded border border-zinc-800 overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-2 py-2 text-left text-zinc-400 font-medium">Name</th>
                  <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSF EUR</th>
                  <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam EUR</th>
                  <th className="px-2 py-2 text-right text-zinc-400 font-medium">Mult</th>
                  <th className="px-2 py-2 text-right text-zinc-400 font-medium">Profit/€100</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((item, i) => (
                  <tr
                    key={item.name}
                    className={[
                      "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                      i % 2 === 1 ? "bg-zinc-900/30" : "",
                    ].join(" ")}
                  >
                    <td className="px-2 py-1.5 text-zinc-200">{item.name}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.csf_price_eur)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_price_eur)}</td>
                    <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(item.multiplier)}`}>
                      {fmt.mult(item.multiplier)}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${profitClass(item.profit_per_100_eur)}`}>
                      {fmt.profit(item.profit_per_100_eur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && items?.length === 0 && (
        <p className="text-zinc-600 text-xs">
          No items tracked.{" "}
          <Link to="/items" className="text-emerald-600 hover:text-emerald-400">
            Add some →
          </Link>
        </p>
      )}
    </div>
  );
}
