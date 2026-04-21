import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  useAddCaseOpeningItem,
  useCaseOpening,
  useRemoveCaseOpeningItem,
  useSyncCaseOpening,
  useSyncCaseOpeningItem,
  useUpdateCaseOpening,
  useUpdateCaseOpeningItem,
  useUpdateCaseOpeningItemStatus,
} from "../hooks/useCaseOpenings";
import { useCurrency } from "../context/CurrencyContext";
import { useExchangeRate } from "../hooks/useExchangeRate";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import StatCard from "../components/ui/StatCard";
import { fmt, relativeTime } from "../utils/format";
import type { CaseOpeningItem, CaseOpeningItemStatusPatch, ItemStatus } from "../types/api";

const WEAR_OPTIONS = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
const STATUS_OPTIONS: ItemStatus[] = ["opened", "for_sale", "delisted", "sold"];

type SortCol =
  | "name" | "wear" | "float_value"
  | "csf_price_eur" | "csf_realized_eur"
  | "steam_price_eur" | "steam_net"
  | "item_multiplier" | "status" | "created_at" | "status_updated_at" | "last_synced_at";

function colValue(item: CaseOpeningItem, col: SortCol): number | string {
  switch (col) {
    case "name": return item.name;
    case "wear": return item.wear;
    case "float_value": return item.float_value ?? -1;
    case "csf_price_eur": return item.csf_price_eur ?? -1;
    case "csf_realized_eur": return item.csf_realized_eur ?? -1;
    case "steam_price_eur": return item.steam_price_eur ?? -1;
    case "steam_net": return item.steam_price_eur != null ? item.steam_price_eur / 1.15 : -1;
    case "item_multiplier": return item.item_multiplier ?? -1;
    case "status": return item.status;
    case "created_at": return item.created_at ?? "";
    case "status_updated_at": return item.status_updated_at ?? "";
    case "last_synced_at": return item.last_synced_at ?? "";
  }
}

function statusColor(s: ItemStatus) {
  switch (s) {
    case "opened": return "text-zinc-400";
    case "for_sale": return "text-amber-400";
    case "sold": return "text-emerald-400";
    case "delisted": return "text-red-400";
  }
}

// CS2 rarity integer → exact Steam/CSFloat rarity color
const RARITY_COLORS: Record<number, string> = {
  1: "#b0c3d9", // Consumer Grade
  2: "#5e98d9", // Industrial Grade
  3: "#4b69ff", // Mil-Spec
  4: "#8847ff", // Restricted
  5: "#d32ce6", // Classified
  6: "#eb4b4b", // Covert
  7: "#e4ae39", // Extraordinary / Contraband
};

function rarityColor(rarity: number | null): string | undefined {
  return rarity != null ? RARITY_COLORS[rarity] : undefined;
}

function multiplierColor(m: number | null) {
  if (m == null) return "text-zinc-500";
  if (m >= 1.2) return "text-emerald-400 font-semibold";
  if (m >= 1.0) return "text-amber-400";
  return "text-red-400";
}

function pct(n: number | null | undefined, digits = 1) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function SortTh({ label, col, active, dir, onToggle, align = "text-right" }: {
  label: string; col: SortCol; active: SortCol; dir: "asc" | "desc";
  onToggle: (c: SortCol) => void; align?: string;
}) {
  return (
    <th
      onClick={() => onToggle(col)}
      className={`px-2 py-2 ${align} text-zinc-400 font-medium cursor-pointer hover:text-zinc-200 select-none whitespace-nowrap`}
    >
      {label}
      <span className={`ml-1 ${col === active ? "text-emerald-400" : "text-zinc-700"}`}>
        {col === active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

function ItemAddModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [wear, setWear] = useState("Field-Tested");
  const [floatVal, setFloatVal] = useState("");
  const [stattrak, setStattrak] = useState(false);
  const addItem = useAddCaseOpeningItem(sessionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addItem.mutate(
      { name: name.trim(), wear, float_value: floatVal ? parseFloat(floatVal) : null, stattrak },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-emerald-800/50 rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Add Item</h3>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AK-47 | Redline"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Wear</label>
          <select
            value={wear}
            onChange={(e) => setWear(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            {WEAR_OPTIONS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Float (optional)</label>
          <input
            type="number" step="0.0001" min="0" max="1"
            value={floatVal}
            onChange={(e) => setFloatVal(e.target.value)}
            placeholder="0.1234"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStattrak((v) => !v)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${stattrak ? "border-amber-600 bg-amber-900/40 text-amber-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
          >
            ST™
          </button>
          <span className="text-[11px] text-zinc-500">{stattrak ? "StatTrak" : "Normal"}</span>
        </div>

        {addItem.isError && (
          <p className="text-xs text-red-400">Failed to add item — check backend logs.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={addItem.isPending || !name.trim()}
            className="flex-1 px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
          >
            {addItem.isPending ? "Adding…" : "Add Item"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemEditModal({ item, sessionId, onClose }: {
  item: CaseOpeningItem; sessionId: string; onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [wear, setWear] = useState(item.wear);
  const [floatVal, setFloatVal] = useState(item.float_value?.toString() ?? "");
  const [stattrak, setStattrak] = useState(item.stattrak);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [marketplace, setMarketplace] = useState<string>(item.marketplace ?? "");
  const [salePrice, setSalePrice] = useState(item.sale_price?.toString() ?? "");

  const updateItem = useUpdateCaseOpeningItem(sessionId);
  const updateStatus = useUpdateCaseOpeningItemStatus(sessionId);
  const isPending = updateItem.isPending || updateStatus.isPending;

  const showSalePrice = status === "for_sale" || status === "sold";

  const propsChanged = name !== item.name || wear !== item.wear || stattrak !== item.stattrak ||
    (floatVal !== "" ? parseFloat(floatVal) !== item.float_value : item.float_value != null);
  const parsedSalePrice = salePrice !== "" ? parseFloat(salePrice) : null;
  const statusChanged = status !== item.status
    || (marketplace || null) !== (item.marketplace ?? null)
    || parsedSalePrice !== (item.sale_price ?? null);

  const handleSave = async () => {
    try {
      if (propsChanged) {
        await updateItem.mutateAsync({
          itemId: item.id,
          patch: {
            ...(name !== item.name ? { name } : {}),
            ...(wear !== item.wear ? { wear } : {}),
            ...(stattrak !== item.stattrak ? { stattrak } : {}),
            ...(floatVal !== "" ? { float_value: parseFloat(floatVal) } : {}),
          },
        });
      }
      if (statusChanged) {
        const patch: CaseOpeningItemStatusPatch = {
          status,
          marketplace: marketplace || null,
          sale_price: showSalePrice ? parsedSalePrice : null,
        };
        await updateStatus.mutateAsync({ itemId: item.id, patch });
      }
      onClose();
    } catch {
      // errors shown via mutation state
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Edit Item</h3>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Wear</label>
          <select
            value={wear}
            onChange={(e) => setWear(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
          >
            {WEAR_OPTIONS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500">Float</label>
          <input
            type="number" step="0.0001" min="0" max="1"
            value={floatVal}
            onChange={(e) => setFloatVal(e.target.value)}
            placeholder="optional"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          {(name !== item.name || wear !== item.wear) && (
            <p className="text-[10px] text-amber-500">Name/wear changed — prices will be cleared, re-sync after saving.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStattrak((v) => !v)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${stattrak ? "border-amber-600 bg-amber-900/40 text-amber-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
          >
            ST™
          </button>
          <span className="text-[11px] text-zinc-500">{stattrak ? "StatTrak" : "Normal"}</span>
        </div>

        <div className="border-t border-zinc-800 pt-2 flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-zinc-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ItemStatus)}
              className={`bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-zinc-500 ${statusColor(status)}`}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-zinc-500">Marketplace</label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
            >
              <option value="">—</option>
              <option value="steam">Steam</option>
              <option value="csfloat">CSFloat</option>
            </select>
          </div>
        </div>

        {showSalePrice && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-500">Sale price (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        )}

        {(updateItem.isError || updateStatus.isError) && (
          <p className="text-xs text-red-400">Save failed — check backend logs.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isPending || (!propsChanged && !statusChanged)}
            className="flex-1 px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemSyncButton({ sessionId, index, sold }: { sessionId: string; index: number; sold?: boolean }) {
  const { mutate, isPending } = useSyncCaseOpeningItem(sessionId);
  return (
    <button
      onClick={() => mutate(index)}
      disabled={isPending || sold}
      title={sold ? "Sold — prices locked" : "Sync prices"}
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

function ItemRow({ item, sessionId, originalIndex, symbol, cv, onEdit }: {
  item: CaseOpeningItem; sessionId: string; originalIndex: number;
  symbol: string; cv: (v: number | null | undefined) => number | null;
  onEdit: (item: CaseOpeningItem) => void;
}) {
  const isSold = item.status === "sold";
  const soldOnCsf = isSold && item.marketplace === "csfloat";
  const soldOnSteam = isSold && item.marketplace === "steam";

  // CSF column: sale_price if sold on CSFloat; otherwise live market (frozen at sale for sold items)
  const displayCsfPrice = soldOnCsf && item.sale_price != null ? item.sale_price : item.csf_price_eur;
  const csfIsSalePrice = soldOnCsf && item.sale_price != null;
  const csfIsSnapshot = soldOnSteam; // sold on Steam → CSF shows at-sale market snapshot

  // Steam column: sale_price if sold on Steam; otherwise live/snapshot market
  const displaySteamPrice = soldOnSteam && item.sale_price != null ? item.sale_price : item.steam_price_eur;
  const steamIsSalePrice = soldOnSteam && item.sale_price != null;
  const steamIsSnapshot = soldOnCsf; // sold on CSFloat → Steam shows at-sale market snapshot

  // Steam Net: always displaySteamPrice / 1.15
  const steamNet = displaySteamPrice != null ? displaySteamPrice / 1.15 : null;

  return (
    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
      <td className="px-2 py-1.5 max-w-[180px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {item.icon_url && (
            <img src={item.icon_url} alt="" className="shrink-0 w-6 h-6 object-contain" />
          )}
          {item.stattrak && (
            <span className="shrink-0 px-1 py-0.5 rounded text-[9px] bg-amber-900/50 text-amber-400 border border-amber-800 leading-none">ST™</span>
          )}
          <button
            onClick={() => onEdit(item)}
            title={item.name}
            style={{ color: rarityColor(item.rarity) }}
            className="hover:brightness-125 transition-all text-left truncate text-xs"
          >
            {item.name}
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5 text-zinc-400 whitespace-nowrap text-xs">{item.wear}</td>
      <td className="px-2 py-1.5 text-right text-zinc-400 text-xs">{item.float_value?.toFixed(4) ?? "—"}</td>

      {/* CSF: sale_price when sold on CSFloat; at-sale market snapshot when sold on Steam */}
      <td className="px-2 py-1.5 text-right text-xs">
        <span className={csfIsSalePrice ? "text-zinc-300 font-medium" : csfIsSnapshot ? "text-zinc-500" : "text-zinc-300"}>
          {fmt.cur(cv(displayCsfPrice), symbol)}
        </span>
        {csfIsSnapshot && <span className="block text-[9px] text-zinc-600">at sale</span>}
      </td>

      {/* Real: always CSF-based — sale_price×0.98 if sold on CSFloat, else csf_market×0.98 */}
      <td className="px-2 py-1.5 text-right text-xs">
        <span className={csfIsSalePrice ? "text-zinc-300" : "text-zinc-400"}>
          {fmt.cur(cv(item.csf_realized_eur), symbol)}
        </span>
        {csfIsSnapshot && <span className="block text-[9px] text-zinc-600">at sale</span>}
      </td>

      {/* Steam: sale_price when sold on Steam; at-sale market snapshot when sold on CSFloat */}
      <td className="px-2 py-1.5 text-right text-xs">
        <span className={steamIsSalePrice ? "text-zinc-300 font-medium" : steamIsSnapshot ? "text-zinc-500" : "text-zinc-300"}>
          {fmt.cur(cv(displaySteamPrice), symbol)}
        </span>
        {steamIsSnapshot && <span className="block text-[9px] text-zinc-600">at sale</span>}
      </td>

      {/* Steam Net: always displaySteamPrice / 1.15 */}
      <td className="px-2 py-1.5 text-right text-xs">
        <span className={steamIsSalePrice ? "text-zinc-300" : "text-zinc-400"}>
          {fmt.cur(cv(steamNet), symbol)}
        </span>
        {steamIsSnapshot && <span className="block text-[9px] text-zinc-600">at sale</span>}
      </td>

      <td className={`px-2 py-1.5 text-right text-xs ${multiplierColor(item.item_multiplier)}`}>
        {item.item_multiplier != null ? item.item_multiplier.toFixed(3) + "x" : "—"}
      </td>
      <td className="px-2 py-1.5 text-center">
        <button
          onClick={() => onEdit(item)}
          className={`text-[11px] whitespace-nowrap leading-none ${statusColor(item.status)}`}
        >
          {item.status.replace("_", " ")}
          {item.marketplace && (
            <span className="block text-zinc-500 text-[10px]">{item.marketplace}</span>
          )}
        </button>
      </td>
      <td className="px-2 py-1.5 text-center text-[13px]">
        {item.created_at
          ? (Date.now() - new Date(item.created_at).getTime() > 7 * 24 * 60 * 60 * 1000 ? "✅" : "❌")
          : "—"}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px] whitespace-nowrap">
        {item.created_at ? relativeTime(item.created_at) : "—"}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px] whitespace-nowrap">
        {relativeTime(item.status_updated_at)}
      </td>
      <td className="px-2 py-1.5 text-right text-zinc-500 text-[11px] whitespace-nowrap">
        {item.last_synced_at ? relativeTime(item.last_synced_at) : "—"}
      </td>
      <td className="px-2 py-1.5 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <ItemSyncButton sessionId={sessionId} index={originalIndex} sold={isSold} />
          <ItemDeleteButton sessionId={sessionId} index={originalIndex} />
        </div>
      </td>
    </tr>
  );
}

export default function CaseOpeningDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isLoading, error } = useCaseOpening(id!);
  const syncSession = useSyncCaseOpening(id!);
  const updateSession = useUpdateCaseOpening(id!);

  const { convert, symbol } = useCurrency();
  const { data: rateData } = useExchangeRate();
  const rate = rateData?.rate ?? 1;
  const cv = (v: number | null | undefined) => convert(v, rate);

  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editingItem, setEditingItem] = useState<CaseOpeningItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [editingUnbox, setEditingUnbox] = useState(false);
  const [editingMult, setEditingMult] = useState(false);
  const [unboxDraft, setUnboxDraft] = useState("");
  const [multDraft, setMultDraft] = useState("");
  const [editingSteamBal, setEditingSteamBal] = useState(false);
  const [editingCsfBal, setEditingCsfBal] = useState(false);
  const [steamBalDraft, setSteamBalDraft] = useState("");
  const [csfBalDraft, setCsfBalDraft] = useState("");

  if (isLoading) return <div className="flex items-center gap-2 text-zinc-500 text-xs"><Spinner /> Loading…</div>;
  if (error || !session) return <ErrorBanner message={(error as Error)?.message ?? "Session not found"} />;

  const handleSyncAll = () => {
    setRateLimitMsg(null);
    syncSession.mutate(undefined, {
      onError: (err) => {
        const e = err as { status?: number; message?: string };
        if (e.status === 429) setRateLimitMsg(e.message ?? "Steam rate limit hit");
      },
    });
  };

  const toggleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const indexedItems = session.items.map((item, i) => ({ item, originalIndex: i }));
  const filtered = filter
    ? indexedItems.filter(({ item }) => item.name.toLowerCase().includes(filter.toLowerCase()))
    : indexedItems;
  const sorted = [...filtered].sort((a, b) => {
    const av = colValue(a.item, sortCol);
    const bv = colValue(b.item, sortCol);
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thSort = (label: string, col: SortCol, align?: string) => (
    <SortTh label={label} col={col} active={sortCol} dir={sortDir} onToggle={toggleSort} align={align} />
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {editingName ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (nameDraft.trim()) updateSession.mutate({ name: nameDraft.trim() });
            setEditingName(false);
          }} className="flex items-center gap-1">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm font-bold text-zinc-100 focus:outline-none w-48"
            />
            <button type="submit" className="text-emerald-400 hover:text-emerald-300 text-sm">✓</button>
            <button type="button" onClick={() => setEditingName(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
          </form>
        ) : (
          <button
            onClick={() => { setNameDraft(session.name); setEditingName(true); }}
            className="text-sm font-bold text-zinc-100 hover:text-emerald-400 transition-colors text-left"
          >
            {session.name}
          </button>
        )}
        <div className="flex items-center gap-2">
          {editingDate ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              if (dateDraft) updateSession.mutate({ date: dateDraft });
              setEditingDate(false);
            }} className="flex items-center gap-1">
              <input
                autoFocus
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
              />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300 text-xs">✓</button>
              <button type="button" onClick={() => setEditingDate(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
            </form>
          ) : (
            <button
              onClick={() => { setDateDraft(session.date); setEditingDate(true); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {session.date}
            </button>
          )}
          <button
            onClick={() => setAddingItem(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/40 hover:text-emerald-300 transition-colors"
          >
            <Plus size={11} />
            Add Item
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncSession.isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={syncSession.isSyncing ? "animate-spin" : ""} />
            {syncSession.isSyncing ? "Syncing…" : "Sync All"}
          </button>
        </div>
      </div>

      {/* Editable controls */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Unbox price:</span>
          {editingUnbox ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(unboxDraft);
              if (!isNaN(v)) updateSession.mutate({ unbox_price: v });
              setEditingUnbox(false);
            }} className="flex items-center gap-1">
              <input autoFocus type="number" step="0.01" value={unboxDraft}
                onChange={(e) => setUnboxDraft(e.target.value)}
                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none" />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">✓</button>
              <button type="button" onClick={() => setEditingUnbox(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </form>
          ) : (
            <button onClick={() => { setUnboxDraft(String(session.unbox_price)); setEditingUnbox(true); }}
              className="text-zinc-200 hover:text-emerald-400 transition-colors">
              {fmt.cur(cv(session.unbox_price), symbol)}
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
              <input autoFocus type="number" step="0.01" value={multDraft}
                onChange={(e) => setMultDraft(e.target.value)}
                className="w-16 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none" />
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
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Steam start:</span>
          {editingSteamBal ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = steamBalDraft === "" ? null : parseFloat(steamBalDraft);
              updateSession.mutate({ steam_balance_start: v });
              setEditingSteamBal(false);
            }} className="flex items-center gap-1">
              <input autoFocus type="number" step="0.01" value={steamBalDraft}
                onChange={(e) => setSteamBalDraft(e.target.value)}
                placeholder="0.00"
                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none placeholder-zinc-600" />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">✓</button>
              <button type="button" onClick={() => setEditingSteamBal(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </form>
          ) : (
            <button onClick={() => { setSteamBalDraft(session.steam_balance_start?.toString() ?? ""); setEditingSteamBal(true); }}
              className="text-zinc-200 hover:text-emerald-400 transition-colors">
              {session.steam_balance_start != null ? fmt.cur(cv(session.steam_balance_start), symbol) : <span className="text-zinc-600">—</span>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">CSFloat start:</span>
          {editingCsfBal ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const v = csfBalDraft === "" ? null : parseFloat(csfBalDraft);
              updateSession.mutate({ csf_balance_start: v });
              setEditingCsfBal(false);
            }} className="flex items-center gap-1">
              <input autoFocus type="number" step="0.01" value={csfBalDraft}
                onChange={(e) => setCsfBalDraft(e.target.value)}
                placeholder="0.00"
                className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:outline-none placeholder-zinc-600" />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">✓</button>
              <button type="button" onClick={() => setEditingCsfBal(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </form>
          ) : (
            <button onClick={() => { setCsfBalDraft(session.csf_balance_start?.toString() ?? ""); setEditingCsfBal(true); }}
              className="text-zinc-200 hover:text-emerald-400 transition-colors">
              {session.csf_balance_start != null ? fmt.cur(cv(session.csf_balance_start), symbol) : <span className="text-zinc-600">—</span>}
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      {(() => {
        const soldItems = session.items.filter((i) => i.status === "sold");
        const csfSold = soldItems.filter((i) => i.marketplace === "csfloat");
        const steamSold = soldItems.filter((i) => i.marketplace === "steam");
        const totalCsfSold = csfSold.reduce((s, i) => s + (i.sale_price ?? 0) * 0.98, 0);
        const totalSteamSold = steamSold.reduce((s, i) => s + (i.sale_price ?? 0) / 1.15, 0);
        const csfCurrent = session.csf_balance_start != null
          ? session.csf_balance_start + totalCsfSold
          : null;
        const steamCurrent = session.steam_balance_start != null
          ? session.steam_balance_start + totalSteamSold
          : null;
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
              <StatCard label="Items" value={String(session.items.length)} />
              <StatCard label="CSF ROI" value={pct(session.csf_roi)} />
              <StatCard label="Steam ROI" value={pct(session.steam_roi)} />
              <StatCard label="CSF ROI ×Mult" value={pct(session.csf_roi_multiplied)} />
              <StatCard label={`Total Net (${symbol})`} value={fmt.cur(cv(session.total_csf_value), symbol)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <StatCard label={`Sold CSFloat (${symbol})`} value={csfSold.length > 0 ? fmt.cur(cv(totalCsfSold), symbol) : "—"} />
              <StatCard label={`Sold Steam (${symbol})`} value={steamSold.length > 0 ? fmt.cur(cv(totalSteamSold), symbol) : "—"} />
              <StatCard label={`CSFloat bal (${symbol})`} value={csfCurrent != null ? fmt.cur(cv(csfCurrent), symbol) : "—"} />
              <StatCard label={`Steam bal (${symbol})`} value={steamCurrent != null ? fmt.cur(cv(steamCurrent), symbol) : "—"} />
            </div>
          </>
        );
      })()}

      {rateLimitMsg && (
        <div className="mb-3">
          <ErrorBanner variant="rateLimit" message={rateLimitMsg} onDismiss={() => setRateLimitMsg(null)} />
        </div>
      )}

      {/* Filter */}
      {session.items.length > 0 && (
        <div className="mb-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter items…"
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-48"
          />
          {filter && (
            <span className="ml-2 text-[11px] text-zinc-500">{sorted.length} / {session.items.length}</span>
          )}
        </div>
      )}

      {/* Item table */}
      {session.items.length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800 mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                {thSort("Item", "name", "text-left")}
                {thSort("Wear", "wear", "text-left")}
                {thSort("Float", "float_value")}
                {thSort(`CSF`, "csf_price_eur")}
                {thSort(`Real`, "csf_realized_eur")}
                {thSort(`Steam`, "steam_price_eur")}
                {thSort(`Steam Net`, "steam_net")}
                {thSort("Mult", "item_multiplier")}
                {thSort("Status", "status")}
                <th className="px-2 py-2 text-center text-zinc-400 font-medium whitespace-nowrap">Trade</th>
                {thSort("Created At", "created_at")}
                {thSort("Last Updated", "status_updated_at")}
                {thSort("Synced", "last_synced_at")}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ item, originalIndex }) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  sessionId={id!}
                  originalIndex={originalIndex}
                  symbol={symbol}
                  cv={cv}
                  onEdit={setEditingItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {session.items.length === 0 && (
        <p className="text-zinc-600 text-xs mb-4">No items yet — use the Add Item button above.</p>
      )}

      {/* Add modal */}
      {addingItem && (
        <ItemAddModal sessionId={id!} onClose={() => setAddingItem(false)} />
      )}

      {/* Edit modal */}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          sessionId={id!}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
