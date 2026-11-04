import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Admin from './Admin';
import Dashboard from './Dashboard';
import Pager, { Choice } from './Pager';
import { Preferences, tr, locale, language } from './i18n';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Session, Order, Payment, AuditEvent, Page } from './types';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : tr('Error inesperado.');
const API = import.meta.env.VITE_API_BASE_URL || '';
const sessionKey = 'pagoclaro.session';
const money = (amount: number, currency = 'COP') => {
  try {
    return new Intl.NumberFormat(locale(), {
      style: 'currency',
      currency
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};
const date = (value: string) => value ? new Intl.DateTimeFormat(locale(), {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date(value)) : '—';
const labels: Record<string, string> = {
  PENDING: tr("Pendiente"),
  PAID: tr("Pagada"),
  CANCELLED: tr("Cancelada"),
  APPROVED: tr("Aprobado"),
  REJECTED: tr("Rechazado"),
  UNKNOWN: tr("Por confirmar")
};
const paymentText: Record<string, string> = {
  PENDING: tr("Esperando respuesta del proveedor."),
  APPROVED: tr("El proveedor confirmó el pago."),
  REJECTED: tr("El proveedor rechazó este intento."),
  UNKNOWN: tr("El resultado aún no se puede confirmar. Se conciliará con el proveedor.")
};
async function request<T = unknown>(path: string, {
  token,
  ...options
}: RequestInit & {
  token?: string;
} = {}): Promise<T> {
  let response;
  try {
    response = await fetch(`${API}/api${path}`, {
      ...options,
      headers: {
        ...(options.body ? {
          'Content-Type': 'application/json'
        } : {}),
        ...(token ? {
          Authorization: `Bearer ${token}`
        } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error(tr("No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo."));
  }
  if (!response.ok) {
    let error: {
      message?: string;
      detail?: string;
    } | undefined;
    try {
      error = (await response.json()) as {
        message?: string;
        detail?: string;
      };
    } catch {/* Responses may not contain JSON. */}
    if (response.status === 401) throw new Error(path === '/auth/login' ? tr("Usuario o contraseña incorrectos.") : tr("La sesión no es válida o ha vencido. Inicia sesión de nuevo."));
    if (response.status === 403) throw new Error(tr("Tu usuario no tiene permiso para realizar esta acción."));
    const generic: Record<number, string> = {
      400: tr("Los datos enviados no son válidos."),
      404: tr("No se encontró el recurso solicitado."),
      409: tr("La solicitud entra en conflicto con el estado actual.")
    };
    throw new Error(language() === 'es' && (error?.message || error?.detail) ? error.message || error.detail : generic[response.status] ? tr(generic[response.status]) : tr('No fue posible completar la solicitud ({0}).', response.status));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
function Icon({
  name,
  size = 20,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    logout: <><path d="M10 17v3H4V4h6v3M14 8l4 4-4 4M8 12h10" /></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8" /></>,
    shield: <><path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z" /><path d="m9 12 2 2 4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    external: <><path d="M13 5h6v6M19 5l-9 9" /><path d="M19 14v5H5V5h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
function Brand() {
  return <div className="brand"><span className="brand-mark"><span /></span><span>pago<span className="brand-light">claro</span><small>{tr("OPERACIONES")}</small></span></div>;
}
function Status({
  value
}: {
  value: string;
}) {
  return <span className={`status status-${(value || '').toLowerCase()}`}><span className="status-dot" />{labels[value] || value || tr("Sin estado")}</span>;
}
function Skeleton({
  className = ''
}: {
  className?: string;
}) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}
function Button({
  children,
  variant = 'primary',
  icon,
  ...props
}: Omit<React.ComponentProps<typeof ShadcnButton>, 'variant'> & {
  variant?: 'primary' | 'secondary';
  icon?: string;
}) {
  return <ShadcnButton variant={variant === 'secondary' ? 'outline' : 'default'} className={`button button-${variant}`} {...props}>{icon && <Icon name={icon} size={17} />}<span>{children}</span></ShadcnButton>;
}
function Alert({
  type = 'error',
  children,
  onClose
}: {
  type?: 'error' | 'success';
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}><span>{children}</span>{onClose && <button className="icon-button" onClick={onClose} aria-label={tr("Cerrar mensaje")}><Icon name="close" size={17} /></button>}</div>;
}
function Login({
  onLogin
}: {
  onLogin: (session: Session) => void;
}) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registering = mode === 'register';
  function changeMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmation('');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (registering && (new TextEncoder().encode(password).length < 12 || new TextEncoder().encode(password).length > 72)) {
      setError(tr("La contraseña debe tener entre 12 y 72 bytes en UTF-8."));
      return;
    }
    if (registering && password !== confirmation) {
      setError(tr("Las contraseñas no coinciden."));
      return;
    }
    setLoading(true);
    try {
      const data = await request<Session>(registering ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });
      if (registering) {
        setMode('login');
        setPassword('');
        setConfirmation('');
        setNotice(tr("Cuenta creada. Inicia sesión para consultar tus operaciones."));
      } else onLogin(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  return <div className="login-page"><div className="login-aside"><Brand /><div className="login-story"><span className="eyebrow light">{tr("PAGOS CON CLARIDAD")}</span><h1>{tr("Cada pago cuenta.")}<br /><em>{tr("Cada estado, también.")}</em></h1><p>{tr("Un espacio para seguir tus órdenes y entender qué está pasando en cada intento de pago.")}</p><div className="login-proof"><Icon name="shield" /><span>{tr("Seguimiento claro, de principio a fin.")}</span></div></div><span className="aside-footer">© All rights reserved Carlos Cortina 2026</span></div><main className="login-main"><div className="login-preferences"><Preferences /></div><div className="mobile-brand"><Brand /></div><form className="login-form" onSubmit={submit}><span className="eyebrow">{registering ? tr("CREA TU CUENTA") : tr("BIENVENIDO DE NUEVO")}</span><h2>{registering ? tr("Crear cuenta") : tr("Iniciar sesión")}</h2><p>{registering ? tr("Regístrate para consultar el estado de las operaciones.") : tr("Ingresa tus credenciales para acceder al panel de operaciones.")}</p>{error && <Alert onClose={() => setError('')}>{error}</Alert>}{notice && <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>}<label>{tr("Usuario")}<input autoComplete="username" required minLength={registering ? 3 : undefined} maxLength={registering ? 50 : undefined} pattern={registering ? '[A-Za-z0-9._-]+' : undefined} title={registering ? tr("Usa letras, números, punto, guion o guion bajo.") : undefined} value={username} onChange={e => setUsername(e.target.value)} placeholder={tr("Tu usuario")} />{registering && <small className="field-hint">{tr("De 3 a 50 caracteres: letras, números, punto, guion o guion bajo.")}</small>}</label><label>{tr("Contraseña")}<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={tr("Tu contraseña")} />{registering && <small className="field-hint">{tr("Entre 12 y 72 bytes; usa una contraseña segura.")}</small>}</label>{registering && <label>{tr("Confirmar contraseña")}<input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder={tr("Repite tu contraseña")} /></label>}<Button type="submit" disabled={loading}>{loading ? registering ? tr("Creando cuenta…") : tr("Ingresando…") : registering ? tr("Crear cuenta") : tr("Ingresar al panel")}</Button><div className="auth-switch">{registering ? tr("¿Ya tienes una cuenta?") : tr("¿Aún no tienes cuenta?")} <button type="button" onClick={() => changeMode(registering ? 'login' : 'register')} disabled={loading}>{registering ? tr("Inicia sesión") : tr("Regístrate")}</button></div><p className="login-help"><Icon name="shield" size={16} /> {registering ? tr("Tu cuenta tendrá acceso de consulta.") : tr("Acceso protegido para usuarios autorizados.")}</p></form></main></div>;
}
function CreateOrder({
  token,
  onClose,
  onCreated
}: {
  token: string;
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const order = await request<Order>('/orders', {
        token,
        method: 'POST',
        body: JSON.stringify({
          reference: reference.trim(),
          amount: Number(amount),
          currency
        })
      });
      onCreated(order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return <Dialog open onOpenChange={open => {
    if (!open && !saving) onClose();
  }}><DialogContent className="modal" showCloseButton={false} onOpenAutoFocus={e => {
      e.preventDefault();
      first.current?.focus();
    }}><div className="modal-heading"><div><span className="eyebrow">{tr("NUEVA OPERACIÓN")}</span><DialogTitle id="new-order-title">{tr("Crear orden")}</DialogTitle><DialogDescription>{tr("Registra los datos para comenzar el seguimiento.")}</DialogDescription></div><button className="icon-button" onClick={onClose} aria-label={tr("Cerrar")} disabled={saving}><Icon name="close" /></button></div><form onSubmit={submit}>{error && <Alert>{error}</Alert>}<label>{tr("Referencia de la orden")}<input ref={first} required maxLength={100} value={reference} onChange={e => setReference(e.target.value)} placeholder="PED-2026-001" /><small>{tr("Usa una referencia que puedas reconocer después.")}</small></label><div className="form-row"><label>{tr("Valor")}<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label><label>{tr("Moneda")}<select value={currency} onChange={e => setCurrency(e.target.value)}><option value="COP">COP</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label></div><div className="modal-actions"><Button variant="secondary" type="button" onClick={onClose} disabled={saving}>{tr("Cancelar")}</Button><Button type="submit" disabled={saving}>{saving ? tr("Creando…") : tr("Crear orden")}</Button></div></form></DialogContent></Dialog>;
}
const eventLabels: Record<string, string> = {
  ORDER_CREATED: tr("Orden creada"),
  PAYMENT_STARTED: tr("Intento iniciado"),
  PAYMENT_APPROVED: tr("Pago aprobado"),
  PAYMENT_REJECTED: tr("Pago rechazado"),
  PAYMENT_UNKNOWN: tr("Pago por confirmar"),
  EVENT_IGNORED: tr("Evento sin cambio de estado"),
  RECONCILED_APPROVED: tr("Pago conciliado: aprobado"),
  RECONCILED_REJECTED: tr("Pago conciliado: rechazado"),
  RECONCILED_UNKNOWN: tr("Pago conciliado: por confirmar"),
  RECONCILED_PENDING: tr("Pago conciliado: pendiente")
};
function AuditTrail({
  orderId,
  token,
  revision
}: {
  orderId: string;
  token: string;
  revision: number;
}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function load(quiet = false) {
      const current = ++sequence;
      if (!quiet) setLoading(true);
      try {
        const result = await request<Page<AuditEvent>>(`/orders/${orderId}/events?page=${page}&size=${size}`, {
          token
        });
        if (active && current === sequence) {
          if (page > Math.max(0, result.totalPages - 1)) { setPage(Math.max(0, result.totalPages - 1)); return; }
          setEvents(result.content || []);
          setTotal(result.totalElements || 0);
          setError('');
        }
      } catch (err) {
        if (active && current === sequence) setError(errorMessage(err));
      } finally {
        if (active && current === sequence) setLoading(false);
      }
    }
    load();
    const timer = setInterval(() => load(true), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId, token, revision, page, size, refresh]);
  useEffect(() => {
    setPage(0);
  }, [orderId]);
  return <section className="audit-section" aria-labelledby="audit-title"><div className="section-heading"><div><span className="eyebrow">{tr("TRAZABILIDAD")}</span><h3 id="audit-title">{tr("Historial de la orden")}</h3></div><button className="icon-button refresh" onClick={() => setRefresh(n => n + 1)} disabled={loading} aria-label={tr("Actualizar historial")}><Icon name="refresh" size={16} /></button></div>{loading ? <div className="audit-loading" aria-label={tr("Cargando historial")}><Skeleton /><Skeleton /><Skeleton /></div> : error ? <div className="audit-message" role="alert">{"" + tr("No pudimos cargar el historial.") + " "}<button className="inline-action" onClick={() => setRefresh(n => n + 1)}>{tr("Reintentar")}</button></div> : events.length ? <ol className="audit-list">{events.map(event => <li key={event.id}><span className="audit-dot" /><div><strong>{eventLabels[event.eventType] || event.eventType.replaceAll('_', ' ')}</strong><small>{date(event.occurredAt)}</small></div></li>)}</ol> : <div className="audit-message">{tr("Aún no hay eventos registrados para esta orden.")}</div>}{!loading && !error && <Pager label={tr("eventos")} total={total} page={page} setPage={setPage} size={size} setSize={setSize} />}</section>;
}
function OrderDetail({
  orderId,
  order,
  loading,
  error,
  onBack,
  onRefresh,
  onPay,
  paying,
  canManage,
  onReconcile,
  reconciling,
  token,
  eventRevision
}: {
  orderId: string;
  order: Order | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onRefresh: () => void;
  onPay: () => void;
  paying: boolean;
  canManage: boolean;
  onReconcile: (id: string) => void;
  reconciling: string | null;
  token: string;
  eventRevision: number;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentSize, setPaymentSize] = useState(10);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function load(quiet = false) {
      const current = ++sequence;
      if (!quiet) setPaymentLoading(true);
      try {
        const result = await request<Page<Payment>>(`/orders/${orderId}/payments?page=${paymentPage}&size=${paymentSize}`, {
          token
        });
        if (active && current === sequence) {
          if (paymentPage > Math.max(0, result.totalPages - 1)) { setPaymentPage(Math.max(0, result.totalPages - 1)); return; }
          setPayments(result.content || []);
          setPaymentTotal(result.totalElements || 0);
          setPaymentError('');
        }
      } catch (err) {
        if (active && current === sequence) setPaymentError(errorMessage(err));
      } finally {
        if (active && current === sequence) setPaymentLoading(false);
      }
    }
    load();
    const timer = setInterval(() => load(true), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId, token, eventRevision, paymentPage, paymentSize, refresh]);
  useEffect(() => {
    setPaymentPage(0);
  }, [orderId]);
  const hasActivePayment = Boolean(order?.hasActivePayment);
  return <section className="detail-panel" aria-label={tr("Detalle de la orden")}><div className="detail-top"><button className="text-button back-button" onClick={onBack}>{tr("← Todas las órdenes")}</button><button className="icon-button" onClick={onRefresh} aria-label={tr("Actualizar detalle")} disabled={loading}><Icon name="refresh" size={18} /></button></div>{loading && !order ? <div className="detail-skeleton" aria-label={tr("Cargando detalle")}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div> : error && !order ? <div className="empty"><p>{error}</p><Button variant="secondary" onClick={onRefresh}>{tr("Reintentar")}</Button></div> : order && <><span className="eyebrow">{tr("DETALLE DE LA ORDEN")}</span><div className="detail-title"><h2>{order.reference}</h2><Status value={order.status} /></div><p className="detail-date">{tr("Creada el {0}", date(order.createdAt))}</p><div className="amount-box"><span>{tr("Valor de la orden")}</span><strong>{money(order.amount, order.currency)}</strong></div>{canManage && <div className="detail-actions"><Button icon="plus" onClick={onPay} disabled={paying || order.status !== 'PENDING' || hasActivePayment}>{paying ? tr("Iniciando pago…") : tr("Iniciar pago")}</Button>{order.status !== 'PENDING' ? <small>{tr("Esta orden ya no admite nuevos intentos.")}</small> : hasActivePayment && <small>{tr("Espera el resultado del intento actual antes de iniciar otro.")}</small>}</div>}<div className="section-heading"><div><span className="eyebrow">{tr("ACTIVIDAD")}</span><h3>{tr("Intentos de pago")}</h3></div><span className="count">{paymentLoading ? '—' : paymentTotal}</span></div>{error && <Alert>{error}</Alert>}{paymentLoading ? <div className="audit-loading" aria-label={tr("Cargando intentos de pago")}><Skeleton /><Skeleton /><Skeleton /></div> : paymentError ? <div className="audit-message" role="alert">{"" + tr("No pudimos cargar los intentos.") + " "}<button className="inline-action" onClick={() => setRefresh(n => n + 1)}>{tr("Reintentar")}</button></div> : payments.length ? <div className="payment-list">{payments.map(p => <article className="payment-item" key={p.id}><div className="payment-icon"><Icon name="receipt" size={18} /></div><div className="payment-info"><div className="payment-head"><strong>{tr("Intento de pago")}</strong><Status value={p.status} /></div><p>{paymentText[p.status] || tr("Consulta el estado de este intento.")}</p><small>{date(p.createdAt)}{p.providerReference ? ` · Ref. ${p.providerReference}` : ''}</small>{canManage && ['PENDING', 'UNKNOWN'].includes(p.status) && <button className="reconcile-button" onClick={() => onReconcile(p.id)} disabled={Boolean(reconciling)}>{reconciling === p.id ? tr("Consultando…") : tr("Consultar al proveedor")}</button>}{p.redirectUrl && p.status === 'PENDING' && <a className="provider-link" href={p.redirectUrl} target="_blank" rel="noopener noreferrer">{"" + tr("Continuar en el proveedor") + " "}<Icon name="external" size={14} /></a>}</div></article>)}</div> : <div className="empty small-empty"><span className="empty-icon"><Icon name="receipt" /></span><strong>{tr("Aún no hay intentos")}</strong><p>{canManage ? tr("Inicia un pago para ver aquí su evolución.") : tr("Los intentos aparecerán aquí cuando estén disponibles.")}</p></div>}{!paymentLoading && !paymentError && <Pager label={tr("intentos")} total={paymentTotal} page={paymentPage} setPage={setPaymentPage} size={paymentSize} setSize={setPaymentSize} />}<AuditTrail orderId={order.id} token={token} revision={eventRevision} /><div className="detail-note"><Icon name="shield" size={17} /><p>{tr("Los estados pueden tardar en actualizarse mientras el proveedor confirma el resultado.")}</p></div></>}</section>;
}
export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      return saved ? JSON.parse(saved) as Session : null;
    } catch {
      return null;
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const orderRequest = useRef(0);
  const [notice, setNotice] = useState('');
  const [eventRevision, setEventRevision] = useState(0);
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const detailRequest = useRef(0);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [screen, setScreen] = useState('orders');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const token = session?.token;
  const canManage = session?.permissions ? session.permissions.includes('PAYMENTS_MANAGE') : Boolean(session?.roles?.includes('ADMIN'));
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const loadOrders = useCallback(async (quiet = false) => {
    if (!token) return;
    const current = ++orderRequest.current;
    if (!quiet) setLoading(true);
    setError('');
    const params = new URLSearchParams({
      page: String(page),
      size: String(pageSize)
    });
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (filter !== 'ALL') params.set('status', filter);
    try {
      const data = await request<Page<Order>>(`/orders?${params}`, {
        token
      });
      if (current !== orderRequest.current) return;
      if (page > Math.max(0, data.totalPages - 1)) { setPage(Math.max(0, data.totalPages - 1)); return; }
      setOrders(data.content || []);
      setTotal(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      if (current === orderRequest.current) setError(errorMessage(err));
    } finally {
      if (current === orderRequest.current) setLoading(false);
    }
  }, [token, page, pageSize, debouncedQuery, filter]);
  const loadDetail = useCallback(async (id: string, quiet = false) => {
    if (!id || !token || selectedRef.current !== id) return;
    const current = ++detailRequest.current;
    if (!quiet) setDetailLoading(true);
    setDetailError('');
    try {
      const data = await request<Order>(`/orders/${id}`, { token });
      if (current === detailRequest.current && selectedRef.current === id) setDetail(data);
    } catch (err) {
      if (current === detailRequest.current && selectedRef.current === id) setDetailError(errorMessage(err));
    } finally {
      if (current === detailRequest.current && selectedRef.current === id) setDetailLoading(false);
    }
  }, [token]);
  function selectOrder(id: string | null) {
    if (selectedRef.current === id) return;
    selectedRef.current = id;
    detailRequest.current++;
    setDetail(null);
    setDetailError('');
    setDetailLoading(Boolean(id));
    setSelectedId(id);
  }
  useEffect(() => {
    if (token) loadOrders();
  }, [token, loadOrders]);
  useEffect(() => {
    if (!selectedId || !token) return;
    setDetail(null);
    loadDetail(selectedId);
  }, [selectedId, token, loadDetail]);
  useEffect(() => {
    if (!selectedId || !token) return;
    const timer = setInterval(() => {
      loadDetail(selectedId, true);
      loadOrders(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedId, token, loadDetail, loadOrders]);
  function login(data: Session) {
    sessionStorage.setItem(sessionKey, JSON.stringify(data));
    setSession(data);
  }
  function logout() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    setOrders([]);
    selectOrder(null);
    orderRequest.current++;
    setNotice('');
    setScreen('orders');
    setPage(0);
    setQuery('');
    setFilter('ALL');
  }
  async function pay() {
    if (!detail || detail.id !== selectedRef.current) return;
    const orderId = detail.id;
    setPaying(true);
    setDetailError('');
    const keyName = `pagoclaro.payment.${orderId}`;
    let key = sessionStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
    }
    try {
      const payment = await request(`/orders/${orderId}/payments`, {
        token,
        method: 'POST',
        headers: {
          'Idempotency-Key': key
        },
        body: '{}'
      });
      sessionStorage.removeItem(keyName);
      await Promise.all([loadDetail(orderId, true), loadOrders(true)]);
      if (selectedRef.current === orderId) { setNotice(tr("El intento de pago fue creado. Sigue su estado en el detalle.")); setEventRevision(k => k + 1); }
      setRefreshKey(k => k + 1);
    } catch (err) {
      if (selectedRef.current === orderId) setDetailError(`${errorMessage(err)} ${tr("Si vuelves a intentarlo se conservará la misma solicitud.")}`);
    } finally {
      setPaying(false);
    }
  }
  async function reconcile(paymentId: string) {
    if (!selectedId || selectedRef.current !== selectedId || detail?.id !== selectedId) return;
    const orderId = selectedId;
    setReconciling(paymentId);
    setDetailError('');
    try {
      await request(`/payments/${paymentId}/reconcile`, {
        token,
        method: 'POST'
      });
      await Promise.all([loadDetail(orderId, true), loadOrders(true)]);
      if (selectedRef.current === orderId) { setEventRevision(k => k + 1); setNotice(tr("Consulta realizada al proveedor simulado. Revisa el estado actualizado del intento.")); }
      setRefreshKey(k => k + 1);
    } catch (err) {
      if (selectedRef.current === orderId) setDetailError(errorMessage(err));
    } finally {
      setReconciling(null);
    }
  }
  if (!session) return <Login onLogin={login} />;
  const filtered = orders;
  return <div className="app-shell"><aside className="sidebar"><Brand /><div className="nav-label">{tr("ESPACIO DE TRABAJO")}</div><nav aria-label={tr("Navegación principal")}><button className={screen === 'orders' ? 'nav-active' : ''} aria-current={screen === 'orders' ? 'page' : undefined} onClick={() => setScreen('orders')}><Icon name="grid" size={18} />{" " + tr("Órdenes") + " "}{screen === 'orders' && <span className="nav-indicator" />}</button>{session.roles?.includes('ADMIN') && <button className={screen === 'admin' ? 'nav-active' : ''} aria-current={screen === 'admin' ? 'page' : undefined} onClick={() => setScreen('admin')}><Icon name="shield" size={18} />{" " + tr("Usuarios y roles") + " "}{screen === 'admin' && <span className="nav-indicator" />}</button>}</nav><div className="sidebar-bottom"><div className="sidebar-card"><Icon name="shield" size={20} /><strong>{tr("Pagos bajo control")}</strong><p>{tr("Consulta el estado de cada operación en un solo lugar.")}</p></div><div className="user-info"><div className="avatar">{session.username?.charAt(0).toUpperCase() || 'U'}</div><div><strong>{session.username}</strong><small>{session.roles?.join(', ') || tr("Usuario")}</small></div><button className="icon-button logout" onClick={logout} aria-label={tr("Cerrar sesión")}><Icon name="logout" size={19} /></button></div></div></aside><div className="workspace"><header className="topbar"><div><span className="topbar-label">{tr("ESPACIO DE TRABAJO")}</span><strong>{tr("Operaciones")}</strong></div><div className="topbar-right"><Preferences /><span className="connection"><span />{" " + tr("Panel de pagos") + ""}</span><button className="mobile-logout icon-button" onClick={logout} aria-label={tr("Cerrar sesión")}><Icon name="logout" /></button></div></header>{session.roles?.includes('ADMIN') && <nav className="mobile-nav" aria-label={tr("Navegación principal")}><button aria-current={screen === 'orders' ? 'page' : undefined} onClick={() => setScreen('orders')}>{tr("Órdenes")}</button><button aria-current={screen === 'admin' ? 'page' : undefined} onClick={() => setScreen('admin')}>{tr("Usuarios y roles")}</button></nav>}<main className="main-content" id="orders">{screen === 'admin' ? <Admin token={session.token} request={request} /> : <><div className="page-heading"><div><div className="breadcrumb">{"" + tr("OPERACIONES") + " "}<span>/</span>{" " + tr("ÓRDENES") + ""}</div><h1>{tr("Órdenes y pagos")}<span className="heading-dot">.</span></h1><p>{tr("Una vista clara de tus operaciones, de principio a fin.")}</p></div>{canManage && <Button icon="plus" onClick={() => setCreating(true)}>{tr("Nueva orden")}</Button>}</div>{notice && <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>}{error && <Alert onClose={() => setError('')}>{error} <button className="inline-action" onClick={() => loadOrders()}>{tr("Reintentar")}</button></Alert>}<Dashboard token={session.token} request={request} refreshKey={refreshKey} /><div className={`content-grid ${selectedId ? 'with-detail' : ''}`}><section className="orders-panel" aria-labelledby="orders-title"><div className="panel-heading"><div><span className="eyebrow">{tr("SEGUIMIENTO")}</span><h2 id="orders-title">{"" + tr("Todas las órdenes") + " "}<span className="count">{loading ? '—' : total}</span></h2><p>{tr("Selecciona una orden para consultar sus pagos.")}</p></div><button className="icon-button refresh" onClick={() => loadOrders()} disabled={loading} aria-label={tr("Actualizar órdenes")}><Icon name="refresh" size={18} /></button></div><div className="filters"><label className="search-box"><Icon name="search" size={18} /><span className="sr-only">{tr("Buscar por referencia")}</span><input value={query} onChange={e => {
                    setPage(0);
                    setQuery(e.target.value);
                  }} maxLength={100} placeholder={tr("Buscar referencia")} /></label><Choice value={filter} onChange={value => {
                  setPage(0);
                  setFilter(value);
                }} label={tr("Filtrar por estado")} options={[{
                  value: "ALL",
                  label: tr("Todos los estados")
                }, {
                  value: "PENDING",
                  label: tr("Pendientes")
                }, {
                  value: "PAID",
                  label: tr("Pagadas")
                }, {
                  value: "CANCELLED",
                  label: tr("Canceladas")
                }]} /></div>{loading ? <div className="order-list" aria-label={tr("Cargando órdenes")}>{[1, 2, 3].map(i => <div className="order-row skeleton-row" key={i}><Skeleton /><Skeleton /><Skeleton /></div>)}</div> : !filtered.length ? <div className="empty"><span className="empty-icon"><Icon name="receipt" size={23} /></span><strong>{error ? tr("No pudimos cargar las órdenes") : query || filter !== 'ALL' ? tr("No encontramos órdenes") : tr("Todavía no hay órdenes")}</strong><p>{error ? tr("Vuelve a intentarlo cuando la conexión esté disponible.") : query || filter !== 'ALL' ? tr("Prueba con otra búsqueda o cambia el filtro.") : canManage ? tr("Crea tu primera orden para comenzar a hacer seguimiento.") : tr("Las órdenes aparecerán aquí cuando estén disponibles.")}</p>{!orders.length && !error && !query && filter === 'ALL' && canManage && <Button variant="secondary" icon="plus" onClick={() => setCreating(true)}>{tr("Crear orden")}</Button>}</div> : <><div className="table-head"><span>{tr("ORDEN")}</span><span>{tr("VALOR")}</span><span>{tr("ESTADO")}</span><span /></div><div className="order-list">{filtered.map(order => <button className={`order-row ${selectedId === order.id ? 'selected' : ''}`} key={order.id} onClick={() => selectOrder(order.id)} aria-pressed={selectedId === order.id}><span className="order-reference"><span className="order-icon"><Icon name="receipt" size={17} /></span><span><strong>{order.reference}</strong><small>{date(order.createdAt)}</small></span></span><span className="order-amount">{money(order.amount, order.currency)}</span><Status value={order.status} /><Icon className="row-arrow" name="arrow" size={18} /></button>)}</div></>}{!loading && !error && <Pager label={tr("órdenes")} total={total} page={page} setPage={setPage} size={pageSize} setSize={setPageSize} />}</section>{selectedId && <OrderDetail orderId={selectedId} order={detail} loading={detailLoading} error={detailError} onBack={() => selectOrder(null)} onRefresh={() => {
              if (selectedId) loadDetail(selectedId);
            }} onPay={pay} paying={paying} canManage={canManage} onReconcile={reconcile} reconciling={reconciling} token={session.token} eventRevision={eventRevision} />}</div></>}<footer>© All rights reserved Carlos Cortina 2026</footer></main></div>{creating && <CreateOrder token={session.token} onClose={() => setCreating(false)} onCreated={order => {
      setCreating(false);
      selectOrder(order.id);
      setNotice(tr("La orden se creó correctamente. Ya puedes iniciar un pago."));
      setPage(0);
      setRefreshKey(k => k + 1);
      loadOrders();
    }} />}</div>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
import './tailwind.css';

