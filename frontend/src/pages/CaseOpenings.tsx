import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Package, TrendingUp, ChevronRight } from "lucide-react";
import { useCaseOpenings, useCreateCaseOpening, useDeleteCaseOpening } from "../hooks/useCaseOpenings";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt } from "../utils/format";

function pct(n: number | null) {
  if (n === null || n === undefined) return null;
  return `${(n * 100).toFixed(1)}%`;
}

function RoiBadge({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-emerald-400">{value}</span>
    </div>
  );
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

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-6 items-end">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(sessions ?? []).map((s) => {
          const csfRoi = pct(s.csf_roi);
          const steamRoi = pct(s.steam_roi);
          const hasRoi = csfRoi || steamRoi;
          return (
            <div key={s.id} className="group relative rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all duration-200 overflow-hidden">
              <Link to={`/case-openings/${s.id}`} className="block p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h2 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                      {s.name}
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{s.date}</p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors" />
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Package size={12} />
                    <span className="text-xs">{s.item_count} item{s.item_count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <TrendingUp size={12} />
                    <span className="text-xs">{fmt.eur(s.unbox_price)} / unbox</span>
                  </div>
                </div>

                {hasRoi ? (
                  <div className="flex gap-4 pt-3 border-t border-zinc-800">
                    <RoiBadge label="CSF ROI" value={csfRoi} />
                    <RoiBadge label="Steam ROI" value={steamRoi} />
                  </div>
                ) : (
                  <div className="pt-3 border-t border-zinc-800">
                    <span className="text-[11px] text-zinc-600">No prices synced yet</span>
                  </div>
                )}
              </Link>

              <button
                onClick={(e) => { e.preventDefault(); deleteSession.mutate(s.id); }}
                disabled={deleteSession.isPending}
                className="absolute top-3 right-8 p-1 text-zinc-700 hover:text-red-400 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
