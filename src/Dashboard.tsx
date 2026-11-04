import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { locale, tr } from './i18n';
import type { ApiRequest, DashboardSummary, SeriesDay, SummaryTotals } from './types';
const format = new Intl.NumberFormat(locale());
const states = [{
  key: 'approved',
  label: tr("Aprobados"),
  color: '#39876b'
}, {
  key: 'pending',
  label: tr("Pendientes"),
  color: '#d6a359'
}, {
  key: 'rejected',
  label: tr("Rechazados"),
  color: '#cb7770'
}, {
  key: 'unknown',
  label: tr("Por confirmar"),
  color: '#8c8eaf'
}] as const;
function shortDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short'
  }).format(d);
}
function Clock({
  value
}: {
  value: string;
}) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(locale(), {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d);
}
function ChartSkeleton() {
  return <div className="chart-skeleton" aria-label={tr("Cargando gráfico")}><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>;
}
function OrdersChart({
  data
}: {
  data: SeriesDay[];
}) {
  const max = Math.max(1, ...data.map(d => Number(d.orders) || 0));
  const total = data.reduce((sum, day) => sum + (Number(day.orders) || 0), 0);
  const labelIndexes = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];
  return <><div className="chart-summary"><strong>{format.format(total)}</strong><span>{tr("órdenes creadas en el período")}</span></div><div className="bar-plot" aria-hidden="true"><div className="plot-grid"><span>{format.format(max)}</span><span>{format.format(Math.round(max / 2))}</span><span>0</span></div><div className="bars">{data.map((d, index) => <div className="bar-column" key={`${d.day}-${index}`}><span className="bar" style={{
            height: `${Math.max((Number(d.orders) || 0) / max * 100, 0)}%`
          }} title={tr("{0}: {1} órdenes", shortDate(d.day), format.format(d.orders))} /></div>)}</div></div><div className="chart-axis" aria-hidden="true">{labelIndexes.map(i => <span key={i}>{shortDate(data[i].day)}</span>)}</div><table className="sr-only"><caption>{tr("Órdenes creadas por fecha durante los últimos 30 días")}</caption><thead><tr><th>{tr("Fecha")}</th><th>{tr("Órdenes")}</th></tr></thead><tbody>{data.map((d, i) => <tr key={`${d.day}-${i}`}><td>{d.day}</td><td>{d.orders}</td></tr>)}</tbody></table></>;
}
function Distribution({
  totals
}: {
  totals: Partial<SummaryTotals>;
}) {
  const count = states.reduce((sum, state) => sum + (Number(totals[state.key]) || 0), 0);
  if (!count) return <div className="chart-empty"><span className="chart-empty-icon">◌</span><strong>{tr("Aún no hay intentos de pago")}</strong><p>{tr("Cuando inicies un pago, podrás consultar su estado aquí.")}</p></div>;
  return <><div className="distribution-total"><strong>{format.format(count)}</strong><span>{tr("intentos registrados")}</span></div><div className="distribution-track" aria-hidden="true">{states.map(s => <span key={s.key} style={{
        width: `${(Number(totals[s.key]) || 0) / count * 100}%`,
        background: s.color
      }} />)}</div><ul className="legend">{states.map(s => {
        const n = Number(totals[s.key]) || 0;
        return <li key={s.key}><span className="legend-label"><i style={{
              background: s.color
            }} />{s.label}</span><span><strong>{format.format(n)}</strong><small>{Math.round(n / count * 100)}%</small></span></li>;
      })}</ul></>;
}
export default function Dashboard({
  token,
  request,
  refreshKey
}: {
  token: string;
  request: ApiRequest;
  refreshKey: number;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setSummary(await request<DashboardSummary>('/dashboard/summary', {
        token
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Error inesperado.'));
    } finally {
      setLoading(false);
    }
  }, [token, request]);
  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60000);
    return () => clearInterval(id);
  }, [load, refreshKey]);
  const totals: Partial<SummaryTotals> = summary?.totals || {};
  const metrics: {
    label: string;
    key: keyof SummaryTotals;
    hint: string;
    icon: string;
    style: string;
  }[] = [{
    label: tr("Órdenes creadas"),
    key: 'orders',
    hint: tr("En los últimos 30 días"),
    icon: '▤',
    style: 'mint'
  }, {
    label: tr("Intentos de pago"),
    key: 'payments',
    hint: tr("Registrados en el período"),
    icon: '↗',
    style: 'cream'
  }, {
    label: tr("Pagos aprobados"),
    key: 'approved',
    hint: tr("Intentos confirmados"),
    icon: '✓',
    style: 'sage'
  }, {
    label: tr("Por confirmar"),
    key: 'unknown',
    hint: tr("Requieren seguimiento"),
    icon: '◷',
    style: 'lilac'
  }];
  return <section className="dashboard" aria-labelledby="dashboard-title"><div className="dashboard-heading"><div><span className="eyebrow">{tr("PANORAMA GENERAL")}</span><h2 id="dashboard-title">{tr("Actividad de pagos")}</h2><p>{tr("Tu operación de los últimos 30 días, en un vistazo. Fechas en UTC.")}</p></div><div className="dashboard-meta"><span className="period-pill">{tr("Últimos 30 días")}</span><span>{summary?.updatedAt ? <>{tr("Actualizado:")} <Clock value={summary.updatedAt} /></> : tr("Resumen de actividad")}</span></div></div>{error && <div className="alert alert-error" role="alert"><span>{"" + tr("No pudimos cargar el resumen.") + " "}{error}</span><button className="inline-action" onClick={() => load()}>{tr("Reintentar")}</button></div>}<div className="metric-grid">{metrics.map(metric => <Card className="metric-card" key={metric.key}><div className="metric-top"><span>{metric.label}</span><span className={`metric-icon ${metric.style}`} aria-hidden="true">{metric.icon}</span></div>{loading ? <span className="skeleton metric-number-skeleton" /> : <strong>{error ? '—' : format.format(Number(totals[metric.key]) || 0)}</strong>}<small>{metric.hint}</small></Card>)}</div><div className="chart-grid"><Card className="chart-card"><div className="chart-heading"><div><span className="eyebrow">{tr("TENDENCIA")}</span><h3>{tr("Órdenes en el tiempo")}</h3><p>{tr("Fecha de creación de la orden.")}</p></div><span className="chart-chip">{tr("30 DÍAS")}</span></div>{loading ? <ChartSkeleton /> : error ? <div className="chart-empty"><strong>{tr("Gráfico no disponible")}</strong><p>{tr("Reintenta cargar el resumen para ver la actividad.")}</p></div> : summary?.series?.length ? <OrdersChart data={summary.series} /> : <div className="chart-empty"><span className="chart-empty-icon">▥</span><strong>{tr("Sin actividad en este período")}</strong><p>{tr("Las órdenes nuevas aparecerán en esta gráfica.")}</p></div>}</Card><Card className="chart-card"><div className="chart-heading"><div><span className="eyebrow">{tr("RESULTADOS")}</span><h3>{tr("Estado de los pagos")}</h3><p>{tr("Distribución de intentos de pago.")}</p></div></div>{loading ? <ChartSkeleton /> : error ? <div className="chart-empty"><strong>{tr("Gráfico no disponible")}</strong><p>{tr("Reintenta cargar el resumen para ver los estados.")}</p></div> : <Distribution totals={totals} />}</Card></div></section>;
}
