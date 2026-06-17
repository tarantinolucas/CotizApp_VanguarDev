import { apiRequest } from "./apiClient";
import type { DashboardNote } from "../types";

export type DashboardPeriod = "week" | "month";

export type DashboardMetrics = {
  quotesSentCurrent: number;
  quotesSentPrevious: number;
  clientsContactedCurrent: number;
  clientsContactedPrevious: number;
  salesWonCurrent: number;
  salesWonPrevious: number;
};

export type DashboardReactivation = {
  id: number;
  id_cliente: number;
  id_usuario: number;
  fecha_emision: string;
  estado: string;
  cliente_nombre_empresa: string;
  cliente_clasificacion: string | null;
  fecha_reactivacion_activa: string;
};

export type DashboardMeta = {
  period: DashboardPeriod;
  reactivations_from: string;
  reactivations_to: string;
  notes_source: "database";
  clients_contacted_scope: "company";
  quotes_sent_source: "tracking";
  sales_won_source: "tracking";
};

export type SalesMetricsKpis = {
  totalRevenue: string;
  closedWonCount: number;
  sentQuotesCount: number;
  closeRate: number;
  averageTicket: string;
};

export type SalesMetricsRevenueByCategory = {
  month_start: string;
  categoria: string | null;
  amount: string;
};

export type SalesMetricsSentByClientType = {
  client_type: string | null;
  sent_count: number;
};

export type SalesMetricsSalesVsQuotes = {
  month_start: string;
  won_count: number;
  sent_count: number;
};

export type SalesMetricsMeta = {
  applied_summary_from: string;
  applied_summary_to_exclusive: string;
  applied_charts_from: string;
  applied_charts_to_exclusive: string;
  used_custom_date_range: boolean;
  defaults: {
    summary: "last_30_days";
    charts: "current_year";
  };
};

export async function getDashboard(input?: { period?: DashboardPeriod }) {
  const params = new URLSearchParams();
  if (input?.period) params.set("period", input.period);
  const qs = params.toString();
  const path = qs ? `/api/dashboard?${qs}` : "/api/dashboard";

  return apiRequest<{
    ok: true;
    metrics: DashboardMetrics;
    reactivations: DashboardReactivation[];
    meta: DashboardMeta;
  }>({ path });
}

export async function getSalesMetrics(input?: {
  from?: string;
  to?: string;
  categoria?: string;
  tipo_cliente?: string;
}) {
  const params = new URLSearchParams();
  if (input?.from) params.set("from", input.from);
  if (input?.to) params.set("to", input.to);
  if (input?.categoria) params.set("categoria", input.categoria);
  if (input?.tipo_cliente) params.set("tipo_cliente", input.tipo_cliente);
  const qs = params.toString();
  const path = qs ? `/api/dashboard/sales-metrics?${qs}` : "/api/dashboard/sales-metrics";

  return apiRequest<{
    ok: true;
    kpis: SalesMetricsKpis;
    revenueByCategory: SalesMetricsRevenueByCategory[];
    sentByClientType: SalesMetricsSentByClientType[];
    salesVsQuotes: SalesMetricsSalesVsQuotes[];
    meta: SalesMetricsMeta;
  }>({ path });
}

export async function listDashboardNotes() {
  const result = await apiRequest<{ ok: true; items: DashboardNote[] }>({
    path: "/api/dashboard/notes"
  });
  return result.items;
}

export async function createDashboardNote(input: { text: string }) {
  const result = await apiRequest<{ ok: true; item: DashboardNote }>({
    path: "/api/dashboard/notes",
    method: "POST",
    body: input
  });
  return result.item;
}

export async function updateDashboardNote(
  id: number,
  input: { text?: string; completed?: boolean }
) {
  const result = await apiRequest<{ ok: true; item: DashboardNote }>({
    path: `/api/dashboard/notes/${id}`,
    method: "PATCH",
    body: input
  });
  return result.item;
}

export async function deleteDashboardNote(id: number) {
  await apiRequest<void>({
    path: `/api/dashboard/notes/${id}`,
    method: "DELETE"
  });
}
