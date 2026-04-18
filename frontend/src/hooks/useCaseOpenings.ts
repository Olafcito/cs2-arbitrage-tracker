import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCaseOpeningItem,
  createCaseOpening,
  deleteCaseOpening,
  getCaseOpening,
  getCaseOpenings,
  removeCaseOpeningItem,
  syncCaseOpening,
  syncCaseOpeningItem,
  updateCaseOpening,
} from "../api/caseOpenings";
import type { CaseOpeningCreate, CaseOpeningItemInput, CaseOpeningPatch } from "../types/api";
import { queryKeys } from "./queryKeys";

export function useCaseOpenings() {
  return useQuery({ queryKey: queryKeys.caseOpenings, queryFn: getCaseOpenings });
}

export function useCaseOpening(id: string) {
  return useQuery({ queryKey: queryKeys.caseOpening(id), queryFn: () => getCaseOpening(id) });
}

export function useCreateCaseOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inp: CaseOpeningCreate) => createCaseOpening(inp),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.caseOpenings }),
  });
}

export function useUpdateCaseOpening(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CaseOpeningPatch) => updateCaseOpening(id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.caseOpening(id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.caseOpenings });
    },
  });
}

export function useDeleteCaseOpening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCaseOpening(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.caseOpenings }),
  });
}

export function useAddCaseOpeningItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inp: CaseOpeningItemInput) => addCaseOpeningItem(sessionId, inp),
    onSuccess: (updated) => qc.setQueryData(queryKeys.caseOpening(sessionId), updated),
  });
}

export function useRemoveCaseOpeningItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => removeCaseOpeningItem(sessionId, index),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.caseOpening(sessionId) }),
  });
}

export function useSyncCaseOpeningItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => syncCaseOpeningItem(sessionId, index),
    onSuccess: (updated) => qc.setQueryData(queryKeys.caseOpening(sessionId), updated),
  });
}

export function useSyncCaseOpening(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncCaseOpening(sessionId),
    onSuccess: () => {
      let ticks = 0;
      const interval = setInterval(() => {
        qc.invalidateQueries({ queryKey: queryKeys.caseOpening(sessionId) });
        ticks++;
        if (ticks >= 15) clearInterval(interval);
      }, 4_000);
    },
  });
}
