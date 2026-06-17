import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Briefcase, CreditCard, DollarSign, FileText, Percent } from "lucide-react";
import { FilterIcon } from "../../components/common/Icons";
import { Button } from "../../components/common/Button";
import * as configService from "../../services/config.service";
import * as dashboardService from "../../services/dashboard.service";
import { getErrorMessage } from "../../utils/feedback";
import "../../styles/metrics.css";
import "../../styles/dashboard.css";

const COLORS = ["#7d39eb", "#a674f1", "#5627a4", "#d6bdf8", "#361866"];

function parseIsoDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Date(Date.UTC(year, month - 1, 1));
}

function buildMonthSeries(startIso: string, endExclusiveIso: string) {
  const start = parseIsoDateValue(startIso);
  const endExclusive = parseIsoDateValue(endExclusiveIso);
  if (!start || !endExclusive) return [];

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const end = new Date(Date.UTC(endExclusive.getUTCFullYear(), endExclusive.getUTCMonth(), 1));
  const months: Array<{ month_start: string; name: string }> = [];

  while (cursor < end) {
    months.push({
      month_start: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-01`,
      name: new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(cursor).replace(".", "")
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months.map((item) => ({
    ...item,
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1)
  }));
}

function formatCurrency(value: number | string, compact = false) {
  const amount = typeof value === "number" ? value : Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2
  }).format(safeAmount);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)}%`;
}

function tooltipCurrencyFormatter(value: unknown) {
  return formatCurrency(typeof value === "number" ? value : Number(value ?? 0));
}

function tooltipIntegerFormatter(value: unknown) {
  return formatInteger(typeof value === "number" ? value : Number(value ?? 0));
}

export default function MetricsPage() {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [tipoClienteFilter, setTipoClienteFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof dashboardService.getSalesMetrics>> | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [clientTypeOptions, setClientTypeOptions] = useState<string[]>([]);

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [categories, clientTypes] = await Promise.all([
          configService.listCatalogOptions({ tipo: "tipo_producto" }),
          configService.listCatalogOptions({ tipo: "tipo_cliente" })
        ]);
        setCategoryOptions(
          Array.from(new Set(categories.filter((item) => item.activo).map((item) => item.value.trim()).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, "es-AR")
          )
        );
        setClientTypeOptions(
          Array.from(new Set(clientTypes.filter((item) => item.activo).map((item) => item.value.trim()).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, "es-AR")
          )
        );
      } catch {
        setCategoryOptions([]);
        setClientTypeOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    }

    void loadOptions();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(null);
      try {
        const data = await dashboardService.getSalesMetrics({
          from: fromDate || undefined,
          to: toDate || undefined,
          categoria: categoriaFilter || undefined,
          tipo_cliente: tipoClienteFilter || undefined
        });
        if (!cancelled) {
          setSnapshot(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, {}, "No se pudieron cargar las métricas"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [categoriaFilter, fromDate, tipoClienteFilter, toDate]);

  const revenueCategories = useMemo(() => {
    if (!snapshot) return [];
    return Array.from(
      new Set(
        snapshot.revenueByCategory
          .map((item) => item.categoria?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [snapshot]);

  const chartMonths = useMemo(() => {
    if (!snapshot) return [];
    return buildMonthSeries(snapshot.meta.applied_charts_from, snapshot.meta.applied_charts_to_exclusive);
  }, [snapshot]);

  const revenueByCategoryData = useMemo(() => {
    if (!snapshot) return [];
    const rowsByMonth = new Map<string, Record<string, unknown>>();

    for (const month of chartMonths) {
      rowsByMonth.set(month.month_start, {
        name: month.name
      });
    }

    for (const row of snapshot.revenueByCategory) {
      const target = rowsByMonth.get(row.month_start);
      if (!target) continue;
      const key = row.categoria?.trim() || "Sin categoría";
      target[key] = Number(row.amount);
    }

    return chartMonths.map((month) => rowsByMonth.get(month.month_start) ?? { name: month.name });
  }, [chartMonths, snapshot]);

  const cumulativeRevenueData = useMemo(() => {
    if (!snapshot) return [];
    const totalsByMonth = new Map<string, number>();

    for (const row of snapshot.revenueByCategory) {
      totalsByMonth.set(row.month_start, (totalsByMonth.get(row.month_start) ?? 0) + Number(row.amount));
    }

    let accumulated = 0;
    return chartMonths.map((month) => {
      accumulated += totalsByMonth.get(month.month_start) ?? 0;
      return {
        name: month.name,
        Ventas: accumulated
      };
    });
  }, [chartMonths, snapshot]);

  const sentByClientTypeData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.sentByClientType.map((row) => ({
      name: row.client_type?.trim() || "Sin tipo",
      value: row.sent_count
    }));
  }, [snapshot]);

  const salesVsQuotesData = useMemo(() => {
    if (!snapshot) return [];
    const byMonth = new Map(snapshot.salesVsQuotes.map((row) => [row.month_start, row]));

    return chartMonths.map((month) => {
      const row = byMonth.get(month.month_start);
      return {
        name: month.name,
        Ventas: row?.won_count ?? 0,
        Presupuestos: row?.sent_count ?? 0
      };
    });
  }, [chartMonths, snapshot]);

  const hasRevenueChartData = revenueByCategoryData.some((row) =>
    Object.entries(row).some(([key, value]) => key !== "name" && Number(value) > 0)
  );
  const hasCumulativeData = cumulativeRevenueData.some((row) => row.Ventas > 0);
  const hasPieData = sentByClientTypeData.some((row) => row.value > 0);
  const hasSalesVsQuotesData = salesVsQuotesData.some((row) => row.Ventas > 0 || row.Presupuestos > 0);

  return (
    <div className="page" style={{ paddingBottom: 60 }}>
      <div className="stack">
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Métricas</h1>
            <div className="pageSubtitle">Analizá el rendimiento de tus ventas y cotizaciones</div>
          </div>
          <div className="actions">
            <Button className="btn--ghost">Descargar PDF</Button>
            <Button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="btn--ghost" style={{ display: "flex", gap: 8 }}>
              <FilterIcon /> Filtros Globales
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="filterToolbar" style={{ padding: "16px", background: "transparent", border: "1px solid var(--border)", borderRadius: "12px", marginTop: "-8px", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", flex: 1 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Desde</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" style={{ border: "none", background: "transparent", padding: "8px 0", outline: "none", color: "var(--text-primary)", flex: 1 }} />
              <span style={{ color: "var(--text-muted)" }}>—</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 4 }}>Hasta</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" style={{ border: "none", background: "transparent", padding: "8px 0", outline: "none", color: "var(--text-primary)", flex: 1 }} />
            </div>
            <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} className="select" style={{ backgroundColor: "var(--surface)", flex: 1 }}>
              <option value="">Categoría (Todas)</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={tipoClienteFilter} onChange={(e) => setTipoClienteFilter(e.target.value)} className="select" style={{ backgroundColor: "var(--surface)", flex: 1 }}>
              <option value="">Tipo de cliente (Todos)</option>
              {clientTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <Button
              className="btn--ghost"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setCategoriaFilter("");
                setTipoClienteFilter("");
              }}
              style={{ flex: "0 0 auto", backgroundColor: "var(--surface)", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px solid var(--border)" }}
            >
              Borrar filtros
            </Button>
          </div>
        )}

        {error ? <div className="error">{error}</div> : null}

        <div className="metricsGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div className="kpiCard kpiCard--animGradient1">
            <div className="kpiTop">
              <div className="kpiLabel">Facturación<br /><strong>Total</strong></div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">{loading ? "..." : formatCurrency(snapshot?.kpis.totalRevenue ?? 0, true)}</div>
              <div className="kpiIconWrap"><DollarSign size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient2">
            <div className="kpiTop">
              <div className="kpiLabel">Operaciones<br /><strong>Cerradas</strong></div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">{loading ? "..." : formatInteger(snapshot?.kpis.closedWonCount ?? 0)}</div>
              <div className="kpiIconWrap"><Briefcase size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient3">
            <div className="kpiTop">
              <div className="kpiLabel">Presupuestos<br /><strong>Enviados</strong></div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">{loading ? "..." : formatInteger(snapshot?.kpis.sentQuotesCount ?? 0)}</div>
              <div className="kpiIconWrap"><FileText size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient2">
            <div className="kpiTop">
              <div className="kpiLabel">Tasa de<br /><strong>Cierre</strong></div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">{loading ? "..." : formatPercentage(snapshot?.kpis.closeRate ?? 0)}</div>
              <div className="kpiIconWrap"><Percent size={20} /></div>
            </div>
          </div>

          <div className="kpiCard kpiCard--animGradient3">
            <div className="kpiTop">
              <div className="kpiLabel">Ticket<br /><strong>Promedio</strong></div>
            </div>
            <div className="kpiBottom">
              <div className="kpiValue">{loading ? "..." : formatCurrency(snapshot?.kpis.averageTicket ?? 0, true)}</div>
              <div className="kpiIconWrap"><CreditCard size={20} /></div>
            </div>
          </div>
        </div>

        <div className="chartsGrid">
          <div className="chartCard">
            <h3 className="chartCardTitle">Facturación mensual por categoría</h3>
            <div className="chartWrapper">
              {hasRevenueChartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(val) => formatCurrency(Number(val), true)} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.02)" }}
                      contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={tooltipCurrencyFormatter}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                    {revenueCategories.map((category, index) => (
                      <Bar key={category} dataKey={category} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="hint" style={{ paddingTop: 32 }}>No hay datos para este período.</div>
              )}
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Ventas acumuladas del año</h3>
            <div className="chartWrapper">
              {hasCumulativeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(val) => formatCurrency(Number(val), true)} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={tooltipCurrencyFormatter} />
                    <Area type="monotone" dataKey="Ventas" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="hint" style={{ paddingTop: 32 }}>No hay datos para este período.</div>
              )}
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Cotizaciones enviadas por tipo de cliente</h3>
            <div className="chartWrapper">
              {hasPieData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentByClientTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {sentByClientTypeData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={tooltipIntegerFormatter} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="hint" style={{ paddingTop: 32 }}>No hay datos para este período.</div>
              )}
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartCardTitle">Cantidad de ventas vs presupuestos enviados</h3>
            <div className="chartWrapper">
              {hasSalesVsQuotesData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesVsQuotesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={tooltipIntegerFormatter} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                    <Bar dataKey="Ventas" barSize={20} fill="var(--primary)" radius={[4, 4, 0, 0]} name="Ganadas" />
                    <Line type="monotone" dataKey="Presupuestos" stroke="#361866" strokeWidth={3} dot={{ r: 4 }} name="Enviadas" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="hint" style={{ paddingTop: 32 }}>No hay datos para este período.</div>
              )}
            </div>
          </div>
        </div>

        {loadingOptions ? <div className="hint">Cargando filtros...</div> : null}
      </div>
    </div>
  );
}
