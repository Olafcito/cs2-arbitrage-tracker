import { useExchangeRate } from "../../hooks/useExchangeRate";

export default function TopBar() {
  const { data, isFetching } = useExchangeRate();

  return (
    <header className="flex items-center justify-end gap-4 px-6 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
      <span>
        {data ? (
          <>
            <span className="text-zinc-500">USD/EUR </span>
            <span className="text-zinc-200">{data.rate.toFixed(5)}</span>
            {isFetching && (
              <span className="ml-1 text-zinc-600 animate-pulse">…</span>
            )}
          </>
        ) : (
          <span className="text-zinc-600">loading rate…</span>
        )}
      </span>
    </header>
  );
}
