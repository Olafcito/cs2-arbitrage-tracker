import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCaseOpenings, useCreateCaseOpening, useDeleteCaseOpening } from "../hooks/useCaseOpenings";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt } from "../utils/format";

function pct(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export default function CaseOpenings() {
  const { data: sessions, isLoading, error } = useCaseOpenings();
  const createSession = useCreateCaseOpening();
  const deleteSession = useDeleteCaseOpening();

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [unboxPrice, setUnboxPrice] = useState("3.50");
  const [multiplier, setMultiplier] = useState("1.0");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createSession.mutate({
      name: name.trim(),
      date,
      unbox_price: parseFloat(unboxPrice) || 0,
      multiplier: parseFloat(multiplier) || 1,
    }, { onSuccess: () => setName("") });
  };

  return (
    <div>
      <h1 className="text-sm font-bold text-zinc-100 mb-4">Case Openings</h1>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Session name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. April session"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Unbox price (€)</label>
          <input
            type="number"
            step="0.01"
            value={unboxPrice}
            onChange={(e) => setUnboxPrice(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Multiplier</label>
          <input
            type="number"
            step="0.01"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-20"
          />
        </div>
        <button
          type="submit"
          disabled={createSession.isPending || !name.trim()}
          className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {createSession.isPending ? <Spinner size={12} /> : "Create"}
        </button>
      </form>

      {error && <ErrorBanner message={(error as Error).message} />}

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Spinner /> Loading…
        </div>
      )}

      {!isLoading && (sessions ?? []).length === 0 && !error && (
        <p className="text-zinc-600 text-xs mt-4">No sessions yet. Create one above.</p>
      )}

      {(sessions ?? []).length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Name</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Date</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Items</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Unbox €</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSF ROI</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam ROI</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).map((s, i) => (
                <tr
                  key={s.id}
                  className={[
                    "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                    i % 2 === 1 ? "bg-zinc-900/30" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-1.5">
                    <Link to={`/case-openings/${s.id}`} className="text-zinc-200 hover:text-emerald-400 transition-colors">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{s.date}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{s.item_count}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(s.unbox_price)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{pct(s.csf_roi)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{pct(s.steam_roi)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => deleteSession.mutate(s.id)}
                      disabled={deleteSession.isPending}
                      className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
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
