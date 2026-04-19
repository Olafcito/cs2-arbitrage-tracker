import { api } from "./client";
import type {
  CaseOpening,
  CaseOpeningCreate,
  CaseOpeningItemInput,
  CaseOpeningPatch,
  CaseOpeningSummary,
} from "../types/api";

export const getCaseOpenings = () => api.get<CaseOpeningSummary[]>("/case-openings");
export const getCaseOpening = (id: string) => api.get<CaseOpening>(`/case-openings/${id}`);
export const createCaseOpening = (inp: CaseOpeningCreate) =>
  api.post<CaseOpening>("/case-openings", inp);
export const updateCaseOpening = (id: string, patch: CaseOpeningPatch) =>
  api.patch<CaseOpening>(`/case-openings/${id}`, patch);
export const deleteCaseOpening = (id: string) => api.delete(`/case-openings/${id}`);
export const addCaseOpeningItem = (id: string, inp: CaseOpeningItemInput) =>
  api.post<CaseOpening>(`/case-openings/${id}/items`, inp);
export const removeCaseOpeningItem = (id: string, index: number) =>
  api.delete(`/case-openings/${id}/items/${index}`) as unknown as Promise<CaseOpening>;
export const syncCaseOpeningItem = (id: string, index: number) =>
  api.post<CaseOpening>(`/case-openings/${id}/items/${index}/sync`, {});
export const syncCaseOpening = (id: string) =>
  api.post<{ message: string; item_count: number }>(`/case-openings/${id}/sync`, {});
export const updateCaseOpeningItem = (
  sessionId: string,
  itemId: string,
  patch: { name?: string; wear?: string; float_value?: number | null },
) =>
  api.patch<import("../types/api").CaseOpening>(
    `/case-openings/${sessionId}/items/${itemId}`,
    patch,
  );

export const updateCaseOpeningItemStatus = (
  sessionId: string,
  itemId: string,
  status: string,
  marketplace: string | null,
) =>
  api.patch<import("../types/api").CaseOpening>(
    `/case-openings/${sessionId}/items/${itemId}/status`,
    { status, marketplace },
  );
