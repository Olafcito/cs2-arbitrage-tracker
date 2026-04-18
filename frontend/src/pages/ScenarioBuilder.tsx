import { useReducer, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useRunScenario, useScenarios } from "../hooks/useScenarios";
import AllocationRow from "../components/forms/AllocationRow";
import type { AllocationDraft } from "../components/forms/AllocationRow";
import StatCard from "../components/ui/StatCard";
import Spinner from "../components/ui/Spinner";
import ErrorBanner from "../components/ui/ErrorBanner";
import { fmt, multiplierClass, relativeTime } from "../utils/format";
import type { ScenarioResult } from "../types/api";

interface FormState {
  budget: string;
  label: string;
  allocations: AllocationDraft[];
  save: boolean;
  executed: boolean;
}

type Action =
  | { type: "SET_BUDGET"; value: string }
  | { type: "SET_LABEL"; value: string }
  | { type: "ADD_ALLOCATION" }
  | { type: "UPDATE_ALLOCATION"; id: string; field: "name" | "pctDisplay"; value: string }
  | { type: "REMOVE_ALLOCATION"; id: string }
  | { type: "TOGGLE_SAVE" }
  | { type: "TOGGLE_EXECUTED" }
  | { type: "RESET" };

function newRow(): AllocationDraft {
  return { id: crypto.randomUUID(), name: "", pctDisplay: "" };
}

const initialState: FormState = {
  budget: "",
  label: "",
  allocations: [newRow()],
  save: false,
  executed: false,
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_BUDGET": return { ...state, budget: action.value };
    case "SET_LABEL": return { ...state, label: action.value };
    case "ADD_ALLOCATION": return { ...state, allocations: [...state.allocations, newRow()] };
    case "UPDATE_ALLOCATION":
      return {
        ...state,
        allocations: state.allocations.map((r) =>
          r.id === action.id ? { ...r, [action.field]: action.value } : r
        ),
      };
    case "REMOVE_ALLOCATION":
      return { ...state, allocations: state.allocations.filter((r) => r.id !== action.id) };
    case "TOGGLE_SAVE": return { ...state, save: !state.save };
    case "TOGGLE_EXECUTED": return { ...state, executed: !state.executed };
    case "RESET": return { ...initialState, allocations: [newRow()] };
  }
}

interface ValidationErrors {
  budget?: string;
  sum?: string;
  allocations: Record<string, { name?: string; pct?: string }>;
}

function validate(state: FormState): ValidationErrors {
  const errs: ValidationErrors = { allocations: {} };
  const budget = parseFloat(state.budget);
  if (!state.budget || isNaN(budget) || budget <= 0) {
    errs.budget = "Budget must be > 0";
  }
  let sum = 0;
  for (const row of state.allocations) {
    const rowErrs: { name?: string; pct?: string } = {};
    if (!row.name.trim()) rowErrs.name = "Required";
    const pct = parseFloat(row.pctDisplay);
    if (!row.pctDisplay || isNaN(pct) || pct <= 0) {
      rowErrs.pct = "Must be > 0";
    } else {
      sum += pct;
    }
    if (Object.keys(rowErrs).length) errs.allocations[row.id] = rowErrs;
  }
  if (Math.abs(sum - 100) > 0.1) {
    errs.sum = `Allocations sum to ${sum.toFixed(1)}% — must be 100%`;
  }
  return errs;
}

function hasErrors(e: ValidationErrors) {
  return !!(e.budget || e.sum || Object.keys(e.allocations).length > 0);
}

function ResultsPanel({ result }: { result: ScenarioResult }) {
  return (
    <div className="mt-6">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        Result{result.label ? `: ${result.label}` : ""}
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Budget" value={fmt.eur(result.budget_eur)} />
        <StatCard label="Keys" value={String(result.keys_final)} accent />
        <StatCard label="CSF Spend" value={fmt.eur(result.total_spend_with_fee_eur)} sub="incl. fee" />
        <StatCard label="Steam Proceeds" value={fmt.eur(result.total_steam_proceeds_eur)} />
        <StatCard label="Leftover Steam" value={fmt.eur(result.leftover_steam_eur)} sub={`${result.keys_raw.toFixed(3)} keys raw`} />
      </div>

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-2 py-2 text-left text-zinc-400 font-medium">Item</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Alloc %</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Budget</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">CSF EUR</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Steam EUR</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Qty</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Spend+Fee</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Proceeds</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Keys</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => {
              const mult = item.steam_proceeds_eur / item.spend_with_fee_eur;
              return (
                <tr
                  key={item.name}
                  className={[
                    "border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors",
                    i % 2 === 1 ? "bg-zinc-900/30" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-1.5 text-zinc-200">{item.name}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.pct(item.pct * 100)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.budget_alloc_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.csf_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-400">{fmt.eur(item.steam_price_eur)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-200 font-medium">{item.quantity}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(item.spend_with_fee_eur)}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${multiplierClass(mult)}`}>
                    {fmt.eur(item.steam_proceeds_eur)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-emerald-400">{item.keys_raw.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-zinc-700 bg-zinc-900/50 font-semibold">
              <td className="px-2 py-1.5 text-zinc-300">TOTAL</td>
              <td className="px-2 py-1.5 text-right text-zinc-400">100%</td>
              <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(result.budget_eur)}</td>
              <td colSpan={2} />
              <td className="px-2 py-1.5 text-right text-zinc-200">{result.total_quantity}</td>
              <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(result.total_spend_with_fee_eur)}</td>
              <td className="px-2 py-1.5 text-right text-emerald-400">{fmt.eur(result.total_steam_proceeds_eur)}</td>
              <td className="px-2 py-1.5 text-right text-emerald-400 font-bold">{result.keys_final}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SavedScenariosList() {
  const { data: scenarios } = useScenarios();
  if (!scenarios?.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        Saved Scenarios
      </h2>
      <div className="rounded border border-zinc-800 overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900">
              <th className="px-2 py-2 text-left text-zinc-400 font-medium">Label</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Budget</th>
              <th className="px-2 py-2 text-right text-zinc-400 font-medium">Keys</th>
              <th className="px-2 py-2 text-zinc-400 font-medium">Saved</th>
              <th className="px-2 py-2 text-zinc-400 font-medium">Executed</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.filename} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                <td className="px-2 py-1.5">
                  <Link
                    to={`/scenarios/${encodeURIComponent(s.filename)}`}
                    className="text-emerald-500 hover:text-emerald-400"
                  >
                    {s.label || s.filename}
                  </Link>
                </td>
                <td className="px-2 py-1.5 text-right text-zinc-300">{fmt.eur(s.budget_eur)}</td>
                <td className="px-2 py-1.5 text-right text-emerald-400 font-medium">{s.keys_final}</td>
                <td className="px-2 py-1.5 text-zinc-500">{relativeTime(s.saved_at)}</td>
                <td className="px-2 py-1.5 text-center">
                  <span className={s.executed ? "text-emerald-400" : "text-zinc-600"}>
                    {s.executed ? "✓" : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScenarioBuilder() {
  const [state, dispatch] = useReducer(reducer, { ...initialState, allocations: [newRow()] });
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [submitErrors, setSubmitErrors] = useState<ValidationErrors>({ allocations: {} });
  const { mutate, isPending, error } = useRunScenario();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(state);
    setSubmitErrors(errs);
    if (hasErrors(errs)) return;

    mutate(
      {
        input: {
          budget_eur: parseFloat(state.budget),
          label: state.label,
          allocations: state.allocations.map((r) => ({
            name: r.name.trim(),
            pct: parseFloat(r.pctDisplay) / 100,
          })),
        },
        save: state.save,
        executed: state.executed,
      },
      {
        onSuccess: (res) => {
          setResult(res);
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        },
      }
    );
  };

  const pctSum = state.allocations
    .map((r) => parseFloat(r.pctDisplay) || 0)
    .reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-sm font-bold text-zinc-100 mb-4">Scenario Builder</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Budget (EUR)</label>
            <input
              type="number"
              value={state.budget}
              onChange={(e) => dispatch({ type: "SET_BUDGET", value: e.target.value })}
              min="0"
              step="0.01"
              placeholder="100"
              className={[
                "w-full bg-zinc-800 border rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none",
                submitErrors.budget ? "border-red-600" : "border-zinc-700 focus:border-emerald-600",
              ].join(" ")}
            />
            {submitErrors.budget && <p className="text-red-400 text-[11px] mt-0.5">{submitErrors.budget}</p>}
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Label (optional)</label>
            <input
              type="text"
              value={state.label}
              onChange={(e) => dispatch({ type: "SET_LABEL", value: e.target.value })}
              placeholder="april_buy"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-500">
              Allocations{" "}
              <span className={Math.abs(pctSum - 100) < 0.1 ? "text-emerald-400" : "text-amber-400"}>
                ({pctSum.toFixed(1)}%)
              </span>
            </label>
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_ALLOCATION" })}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-400 transition-colors"
            >
              <Plus size={11} /> Add row
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {state.allocations.map((row) => (
              <AllocationRow
                key={row.id}
                row={row}
                onChange={(id, field, value) => dispatch({ type: "UPDATE_ALLOCATION", id, field, value })}
                onRemove={(id) => dispatch({ type: "REMOVE_ALLOCATION", id })}
                nameError={submitErrors.allocations[row.id]?.name}
                pctError={submitErrors.allocations[row.id]?.pct}
              />
            ))}
          </div>
          {submitErrors.sum && (
            <p className="text-amber-400 text-[11px] mt-1">{submitErrors.sum}</p>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-zinc-400">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={state.save}
              onChange={() => dispatch({ type: "TOGGLE_SAVE" })}
              className="accent-emerald-500"
            />
            Save to history
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={state.executed}
              onChange={() => dispatch({ type: "TOGGLE_EXECUTED" })}
              className="accent-emerald-500"
            />
            Mark as executed
          </label>
        </div>

        {error && <div className="mb-3"><ErrorBanner message={(error as Error).message} /></div>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded text-xs text-white font-medium transition-colors"
          >
            {isPending ? <><Spinner size={12} /> Running…</> : "Run Scenario"}
          </button>
          <button
            type="button"
            onClick={() => { dispatch({ type: "RESET" }); setResult(null); setSubmitErrors({ allocations: {} }); }}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      {result && <ResultsPanel result={result} />}
      <SavedScenariosList />
    </div>
  );
}
