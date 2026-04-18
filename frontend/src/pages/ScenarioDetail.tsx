import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useScenario } from "../hooks/useScenarios";
import StatCard from "../components/ui/StatCard";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt, multiplierClass, relativeTime } from "../utils/format";

export default function ScenarioDetail() {
  const { filename } = useParams<{ filename: string }>();
  const { data, isLoading, error } = useScenario(filename ?? "");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-xs">
        <Spinner /> Loading…
      </div>
    );
  }

  if (error) return <ErrorBanner message={(error as Error).message} />;
  if (!data) return null;

  const { result } = data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/scenarios"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </Link>
        <h1 className="text-sm font-bold text-zinc-100">
          {result.label || filename}
        </h1>
        {data.executed && (
          <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400">
            Executed
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-500 mb-4">Saved {relativeTime(data.saved_at)}</p>

      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Budget" value={fmt.eur(result.budget_eur)} />
        <StatCard label="Keys" value={String(result.keys_final)} accent />
        <StatCard label="CSF Spend" value={fmt.eur(result.total_spend_with_fee_eur)} sub="incl. fee" />
        <StatCard label="Steam Proceeds" value={fmt.eur(result.total_steam_proceeds_eur)} />
        <StatCard
          label="Leftover Steam"
          value={fmt.eur(result.leftover_steam_eur)}
          sub={`${result.keys_raw.toFixed(3)} keys raw`}
        />
      </div>

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-2 py-2 text-left text-zinc-400 font-medium">Item</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Alloc %</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Budget</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSF EUR</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam EUR</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Qty</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Spend+Fee</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Proceeds</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Keys</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => {
              const mult = item.steam_proceeds_eur / item.spend_with_fee_eur;
              return (
                <tr
                  key={item.name}
                  className={[
                    "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                    i % 2 === 1 ? "bg-zinc-900/30" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-1.5 text-zinc-200">{item.name}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.pct(item.pct * 100)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.budget_alloc_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.csf_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.steam_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-200 font-medium">{item.quantity}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.spend_with_fee_eur)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(mult)}`}>
                    {fmt.eur(item.steam_proceeds_eur)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-emerald-400">{item.keys_raw.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-700 bg-zinc-900/50 font-semibold">
              <td className="px-2 py-1.5 text-zinc-300">TOTAL</td>
              <td className="px-2 py-1.5 text-right text-zinc-400">100%</td>
              <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(result.budget_eur)}</td>
              <td colSpan={2} />
              <td className="px-2 py-1.5 text-right text-zinc-200">{result.total_quantity}</td>
              <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(result.total_spend_with_fee_eur)}</td>
              <td className="px-2 py-1.5 text-right text-emerald-400">{fmt.eur(result.total_steam_proceeds_eur)}</td>
              <td className="px-2 py-1.5 text-right text-emerald-400 font-bold">{result.keys_final}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
