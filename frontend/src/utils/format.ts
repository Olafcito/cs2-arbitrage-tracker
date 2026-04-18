const dash = "—";

export const fmt = {
  eur: (n: number | null | undefined) =>
    n == null ? dash : `€${n.toFixed(2)}`,

  usd: (n: number | null | undefined) =>
    n == null ? dash : `$${n.toFixed(2)}`,

  mult: (n: number | null | undefined) =>
    n == null ? dash : `${n.toFixed(3)}x`,

  pct: (n: number | null | undefined) =>
    n == null ? dash : `${n.toFixed(1)}%`,

  int: (n: number | null | undefined) =>
    n == null ? dash : n.toLocaleString(),

  profit: (n: number | null | undefined) => {
    if (n == null) return dash;
    const sign = n >= 0 ? "+" : "";
    return `${sign}€${n.toFixed(2)}`;
  },

  ratio: (n: number | null | undefined) =>
    n == null ? dash : n.toFixed(3),
};

export function multiplierClass(m: number): string {
  if (m >= 1.5) return "text-emerald-400 font-bold";
  if (m >= 1.2) return "text-emerald-400";
  if (m >= 1.0) return "text-amber-400";
  return "text-red-400";
}

export function profitClass(n: number): string {
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-zinc-400";
}

export function liquidityClass(l: string): string {
  switch (l) {
    case "high":
      return "text-emerald-400";
    case "medium":
      return "text-amber-400";
    case "low":
      return "text-red-400";
    default:
      return "text-zinc-500";
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
