import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScenario,
  getScenarios,
  runScenario,
} from "../api/scenarios";
import type { ScenarioInput } from "../types/api";
import { queryKeys } from "./queryKeys";

export function useScenarios() {
  return useQuery({
    queryKey: queryKeys.scenarios,
    queryFn: getScenarios,
    staleTime: 30_000,
  });
}

export function useScenario(filename: string) {
  return useQuery({
    queryKey: queryKeys.scenario(filename),
    queryFn: () => getScenario(filename),
    staleTime: Infinity,
  });
}

export function useRunScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      save,
      executed,
    }: {
      input: ScenarioInput;
      save: boolean;
      executed: boolean;
    }) => runScenario(input, save, executed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.scenarios });
    },
  });
}
