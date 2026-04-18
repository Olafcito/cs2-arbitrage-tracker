import { api } from "./client";
import type { GroupInput, GroupPatch, ItemGroup } from "../types/api";

export const getGroups = () => api.get<ItemGroup[]>("/groups");
export const getGroup = (id: string) => api.get<ItemGroup>(`/groups/${id}`);
export const createGroup = (inp: GroupInput) => api.post<ItemGroup>("/groups", inp);
export const updateGroup = (id: string, patch: GroupPatch) =>
  api.patch<ItemGroup>(`/groups/${id}`, patch);
export const deleteGroup = (id: string) => api.delete(`/groups/${id}`);
export const syncGroup = (id: string) =>
  api.post<{ message: string; item_count: number }>(`/groups/${id}/sync`, {});
