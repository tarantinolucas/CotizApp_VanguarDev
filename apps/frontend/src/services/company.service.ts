import { apiRequest } from "./apiClient";
import type { Company } from "../types";

export async function listCompanies(input?: { includeInactive?: boolean }) {
  const query = new URLSearchParams();
  if (input?.includeInactive) query.set("include_inactive", "true");
  const path = query.size ? `/api/companies?${query.toString()}` : "/api/companies";
  const result = await apiRequest<{ ok: true; items: Company[] }>({ path });
  return result.items;
}

export async function getCompany(id: number) {
  const result = await apiRequest<{ ok: true; item: Company }>({ path: `/api/companies/${id}` });
  return result.item;
}

export async function createCompany(input: { nombre: string }) {
  const result = await apiRequest<{ ok: true; item: Company }>({
    path: "/api/companies",
    method: "POST",
    body: input
  });
  return result.item;
}

export async function updateCompany(id: number, input: { nombre?: string; activo?: boolean }) {
  const result = await apiRequest<{ ok: true; item: Company }>({
    path: `/api/companies/${id}`,
    method: "PUT",
    body: input
  });
  return result.item;
}

export async function deactivateCompany(id: number) {
  await apiRequest<{ ok: true }>({
    path: `/api/companies/${id}/deactivate`,
    method: "PATCH"
  });
}
