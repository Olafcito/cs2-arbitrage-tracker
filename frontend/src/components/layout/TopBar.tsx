import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useCurrency } from "../../context/CurrencyContext";

export default function TopBar() {
  const { data, isFetching } = useExchangeRate();
  const { currency, setCurrency } = useCurrency();

  return (
    <header className="flex items-center justify-end gap-4 px-6 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
      <div className="flex items-center gap-1 rounded border border-zinc-700 overflow-hidden">
        {(["EUR", "USD"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-2 py-0.5 text-[11px] transition-colors ${
              currency === c
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <span>
        {data ? (
          <>
            <span className="text-zinc-500">USD/EUR </span>
            <span className="text-zinc-200">{data.rate.toFixed(5)}</span>
            {isFetching && <span className="ml-1 text-zinc-600 animate-pulse">…</span>}
          </>
        ) : (
          <span className="text-zinc-600">loading rate…</span>
        )}
      </span>
    </header>
  );
}
