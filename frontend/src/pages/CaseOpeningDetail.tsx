import { useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  useAddCaseOpeningItem,
  useCaseOpening,
  useRemoveCaseOpeningItem,
  useSyncCaseOpening,
  useSyncCaseOpeningItem,
  useUpdateCaseOpening,
} from "../hooks/useCaseOpenings";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import StatCard from "../components/ui/StatCard";
import { fmt, relativeTime } from "../utils/format";
import type { CaseOpeningItem } from "../types/api";

const WEAR_OPTIONS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

function pct(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function ItemSyncButton({ sessionId, index }: { sessionId: string; index: number }) {
  const { mutate, isPending } = useSyncCaseOpeningItem(sessionId);
  return (
    <button
      onClick={() => mutate(index)}
      disabled={isPending}
      title="Sync item prices"
      className="p-1 text-zinc-600 hover:text-emerald-400 disabled:opacity-40 transition-colors"
    >
      <RefreshCw size={11} className={isPending ? "animate-spin" : ""} />
    </button>
  );
}

function ItemDeleteButton({ sessionId, index }: { sessionId: string; index: number }) {
  const { mutate, isPending } = useRemoveCaseOpeningItem(sessionId);
  return (
    <button
      onClick={() => mutate(index)}
      disabled={isPending}
      className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
    >
      {isPending ? <Spinner size={11} /> : <Trash2 size={11} />}
    </button>
  );
}

function ItemRow({ item, index, sessionId }: { item: CaseOpeningItem; index: number; sessionId: string }) {
  const steamNet = item.steam_price_eur !== null ? item.steam_price_eur / 1.15 : null;
  return (
    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
      <td className="px-2 py-1.5 text-zinc-200">{item.name}</td>
      <td className="px-2 py-1.5 text-zinc-400">{item.wear}</td>
      <td className="px-2 py-1.5 text-right text-zinc-400">{item.float_value?.toFixed(4) ?? "—"}</td>
      <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.csf_price_eur)}</td>
      <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.steam_price_eur)}</td>
      <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(steamNet)}</td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px]">
        {item.last_synced_at ? relativeTime(item.last_synced_at) : "—"}
      </td>
      <td className="px-2 py-1.5 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <ItemSyncButton sessionId={sessionId} index={index} />
          <ItemDeleteButton sessionId={sessionId} index={index} />
        </div>
      </td>
    </tr>
  );
}

export default function CaseOpeningDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading, error } = useCaseOpening(id!);
  const addItem = useAddCaseOpeningItem(id!);
  const syncSession = useSyncCaseOpening(id!);
  const updateSession = useUpdateCaseOpening(id!);

  const [itemName, setItemName] = useState("");
  const [wear, setWear] = useState("Field-Tested");
  const [floatVal, setFloatVal] = useState("");
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  // Editable header fields (unbox price + multiplier)
  const [editingUnbox, setEditingUnbox] = useState(false);
  const [editingMult, setEditingMult] = useState(false);
  const [unboxDraft, setUnboxDraft] = useState("");
  const [multDraft, setMultDraft] = useState("");

  if (isLoading) return <div className="flex items-center gap-2 text-zinc-500 text-xs"><Spinner /> Loading…</div>;
  if (error || !session) return <ErrorBanner message={(error as Error)?.message ?? "Session not found"} />;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    addItem.mutate({
      name: itemName.trim(),
      wear,
      float_value: floatVal ? parseFloat(floatVal) : null,
    }, { onSuccess: () => { setItemName(""); setFloatVal(""); } });
  };

  const handleSyncAll = () => {
    setRateLimitMsg(null);
    syncSession.mutate(undefined, {
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        if (e.status === 429) setRateLimitMsg(e.message ?? "Steam rate limit hit");
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm font-bold text-zinc-100">{session.name}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{session.date}</span>
          <button
            onClick={handleSyncAll}
            disabled={syncSession.isPending}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={syncSession.isPending ? "animate-spin" : ""} />
            {syncSession.isPending ? "Syncing…" : "Sync All"}
          </button>
        </div>
      </div>

      {/* Editable controls */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Unbox price:</span>
          {editingUnbox ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(unboxDraft);
              if (!isNaN(v)) updateSession.mutate({ unbox_price: v });
              setEditingUnbox(false);
            }} className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                step="0.01"
                value={unboxDraft}
                onChange={(e) => setUnboxDraft(e.target.value)}
                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none"
              />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">✓</button>
              <button type="button" onClick={() => setEditingUnbox(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </form>
          ) : (
            <button onClick={() => { setUnboxDraft(String(session.unbox_price)); setEditingUnbox(true); }}
              className="text-zinc-200 hover:text-emerald-400 transition-colors">
              {fmt.eur(session.unbox_price)}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Multiplier:</span>
          {editingMult ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(multDraft);
              if (!isNaN(v)) updateSession.mutate({ multiplier: v });
              setEditingMult(false);
            }} className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                step="0.01"
                value={multDraft}
                onChange={(e) => setMultDraft(e.target.value)}
                className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none"
              />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">✓</button>
              <button type="button" onClick={() => setEditingMult(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </form>
          ) : (
            <button onClick={() => { setMultDraft(String(session.multiplier)); setEditingMult(true); }}
              className="text-zinc-200 hover:text-emerald-400 transition-colors">
              {session.multiplier}x
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <StatCard label="Items" value={String(session.items.length)} />
        <StatCard label="CSF ROI" value={pct(session.csf_roi)} />
        <StatCard label="Steam ROI" value={pct(session.steam_roi)} />
        <StatCard label="CSF ROI ×Mult" value={pct(session.csf_roi_multiplied)} />
        <StatCard label="Total CSF" value={fmt.eur(session.total_csf_value)} />
      </div>

      {rateLimitMsg && (
        <div className="mb-3">
          <ErrorBanner variant="rateLimit" message={rateLimitMsg} onDismiss={() => setRateLimitMsg(null)} />
        </div>
      )}

      {/* Item table */}
      {session.items.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800 mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Item</th>
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Wear</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Float</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSFloat €</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam €</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam Net</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Synced</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {session.items.map((item, i) => (
                <ItemRow key={i} item={item} index={i} sessionId={id!} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {session.items.length === 0 && (
        <p className="text-zinc-600 text-xs mb-4">No items yet. Add one below.</p>
      )}

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Item name</label>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="AK-47 | Redline"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-64"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Wear</label>
          <select
            value={wear}
            onChange={(e) => setWear(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            {WEAR_OPTIONS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Float (optional)</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            max="1"
            value={floatVal}
            onChange={(e) => setFloatVal(e.target.value)}
            placeholder="0.1234"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-28"
          />
        </div>
        <button
          type="submit"
          disabled={addItem.isPending || !itemName.trim()}
          className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {addItem.isPending ? <Spinner size={12} /> : "Add Item"}
        </button>
      </form>
    </div>
  );
}
