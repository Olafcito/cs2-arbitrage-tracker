import { api } from "./client";
import type {
  SavedScenario,
  ScenarioInput,
  ScenarioResult,
  ScenarioSummary,
} from "../types/api";

export const getScenarios = () => api.get<ScenarioSummary[]>("/scenarios");

export const getScenario = (filename: string) =>
  api.get<SavedScenario>(`/scenarios/${encodeURIComponent(filename)}`);

export const runScenario = (
  input: ScenarioInput,
  save = false,
  executed = false
) => {
  const qs = new URLSearchParams({
    save: String(save),
    executed: String(executed),
  });
  return api.post<ScenarioResult>(`/scenarios?${qs}`, input);
};
