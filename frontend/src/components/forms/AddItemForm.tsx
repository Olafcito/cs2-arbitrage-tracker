import { useState } from "react";
import { Plus } from "lucide-react";
import { useAddItem } from "../../hooks/useItems";
import Spinner from "../ui/Spinner";
import ErrorBanner from "../ui/ErrorBanner";

export default function AddItemForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useAddItem();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    setError(null);
    mutate(name, {
      onSuccess: () => setValue(""),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="mb-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          placeholder="Item name, e.g. Prisma Case"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded text-xs text-white transition-colors"
        >
          {isPending ? (
            <>
              <Spinner size={12} />
              Resolving…
            </>
          ) : (
            <>
              <Plus size={12} />
              Add
            </>
          )}
        </button>
      </form>
      {error && (
        <div className="mt-2">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}
    </div>
  );
}
