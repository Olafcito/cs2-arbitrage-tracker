import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useSyncGroup,
  useUpdateGroup,
} from "../hooks/useGroups";
import { useItems } from "../hooks/useItems";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import type { ItemGroup } from "../types/api";

function relativeDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function SyncGroupButton({ id }: { id: string }) {
  const { mutate, isPending } = useSyncGroup();
  return (
    <button
      onClick={() => mutate(id)}
      disabled={isPending}
      title="Sync all items in group"
      className="p-1 text-zinc-600 hover:text-emerald-400 disabled:opacity-40 transition-colors"
    >
      <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
    </button>
  );
}

function DeleteGroupButton({ id }: { id: string }) {
  const { mutate, isPending } = useDeleteGroup();
  return (
    <button
      onClick={() => mutate(id)}
      disabled={isPending}
      className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
    >
      {isPending ? <Spinner size={12} /> : <Trash2 size={12} />}
    </button>
  );
}

function ItemSelector({
  group,
  allItemNames,
}: {
  group: ItemGroup;
  allItemNames: string[];
}) {
  const updateGroup = useUpdateGroup();
  const remaining = allItemNames.filter((n) => !group.item_names.includes(n));

  const add = (name: string) =>
    updateGroup.mutate({
      id: group.id,
      patch: { item_names: [...group.item_names, name] },
    });

  const remove = (name: string) =>
    updateGroup.mutate({
      id: group.id,
      patch: { item_names: group.item_names.filter((n) => n !== name) },
    });

  return (
    <div className="mt-1 space-y-1">
      <div className="flex flex-wrap gap-1">
        {group.item_names.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700"
          >
            {name}
            <button
              onClick={() => remove(name)}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {remaining.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) add(e.target.value);
            e.target.value = "";
          }}
          className="text-[11px] bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400 cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>
            + Add item
          </option>
          {remaining.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function Groups() {
  const { data: groups, isLoading, error } = useGroups();
  const { data: items } = useItems();
  const createGroup = useCreateGroup();
  const [newName, setNewName] = useState("");

  const allItemNames = (items ?? []).map((i) => i.name);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createGroup.mutate({ name: newName.trim() }, { onSuccess: () => setNewName("") });
  };

  return (
    <div>
      <h1 className="text-sm font-bold text-zinc-100 mb-4">Item Groups</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New group name…"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={createGroup.isPending || !newName.trim()}
          className="px-3 py-1 text-xs rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {createGroup.isPending ? <Spinner size={12} /> : "Create"}
        </button>
      </form>

      {error && <ErrorBanner message={(error as Error).message} />}

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Spinner /> Loading…
        </div>
      )}

      {!isLoading && (groups ?? []).length === 0 && !error && (
        <p className="text-zinc-600 text-xs mt-4">No groups yet. Create one above.</p>
      )}

      {(groups ?? []).length > 0 && (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Name</th>
                <th className="px-2 py-2 text-left text-zinc-400 font-medium">Items</th>
                <th className="px-2 py-2 text-right text-zinc-400 font-medium">Created</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(groups ?? []).map((group, i) => (
                <tr
                  key={group.id}
                  className={[
                    "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors align-top",
                    i % 2 === 1 ? "bg-zinc-900/30" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-2 text-zinc-200 font-medium whitespace-nowrap">
                    {group.name}
                  </td>
                  <td className="px-2 py-2">
                    <ItemSelector group={group} allItemNames={allItemNames} />
                  </td>
                  <td className="px-2 py-2 text-right text-zinc-500 whitespace-nowrap">
                    {relativeDate(group.created_at)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <SyncGroupButton id={group.id} />
                      <DeleteGroupButton id={group.id} />
                    </div>
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
