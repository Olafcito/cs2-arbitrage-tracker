import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
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
  updateCaseOpeningItem,
  updateCaseOpeningItemStatus,
} from "../api/caseOpenings";
import type { CaseOpeningCreate, CaseOpeningItemInput, CaseOpeningItemStatusPatch, CaseOpeningPatch } from "../types/api";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mutation = useMutation({
    mutationFn: () => syncCaseOpening(sessionId),
    onSuccess: () => {
      setIsSyncing(true);
      let ticks = 0;
      intervalRef.current = setInterval(() => {
        qc.invalidateQueries({ queryKey: queryKeys.caseOpening(sessionId) });
        ticks++;
        if (ticks >= 15) {
          clearInterval(intervalRef.current!);
          setIsSyncing(false);
        }
      }, 4_000);
    },
    onError: () => setIsSyncing(false),
  });

  return { ...mutation, isSyncing: isSyncing || mutation.isPending };
}

export function useUpdateCaseOpeningItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: { name?: string; wear?: string; float_value?: number | null } }) =>
      updateCaseOpeningItem(sessionId, itemId, patch),
    onSuccess: (updated) => qc.setQueryData(queryKeys.caseOpening(sessionId), updated),
  });
}

export function useUpdateCaseOpeningItemStatus(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: CaseOpeningItemStatusPatch }) =>
      updateCaseOpeningItemStatus(sessionId, itemId, patch),
    onSuccess: (updated) => qc.setQueryData(queryKeys.caseOpening(sessionId), updated),
  });
}
