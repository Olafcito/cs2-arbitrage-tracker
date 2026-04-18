import { Trash2 } from "lucide-react";

export interface AllocationDraft {
  id: string;
  name: string;
  pctDisplay: string;
}

interface Props {
  row: AllocationDraft;
  onChange: (id: string, field: "name" | "pctDisplay", value: string) => void;
  onRemove: (id: string) => void;
  nameError?: string;
  pctError?: string;
}

export default function AllocationRow({
  row,
  onChange,
  onRemove,
  nameError,
  pctError,
}: Props) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onChange(row.id, "name", e.target.value)}
          placeholder="Item name"
          className={[
            "w-full bg-zinc-800 border rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none",
            nameError ? "border-red-600 focus:border-red-500" : "border-zinc-700 focus:border-emerald-600",
          ].join(" ")}
        />
        {nameError && <p className="text-red-400 text-[11px] mt-0.5">{nameError}</p>}
      </div>
      <div className="w-24">
        <div className="relative">
          <input
            type="number"
            value={row.pctDisplay}
            onChange={(e) => onChange(row.id, "pctDisplay", e.target.value)}
            placeholder="50"
            min="0"
            max="100"
            step="0.1"
            className={[
              "w-full bg-zinc-800 border rounded px-3 py-1.5 pr-6 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none",
              pctError ? "border-red-600 focus:border-red-500" : "border-zinc-700 focus:border-emerald-600",
            ].join(" ")}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
        </div>
        {pctError && <p className="text-red-400 text-[11px] mt-0.5">{pctError}</p>}
      </div>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
