export interface Session { token: string; username: string; roles: string[]; permissions: string[] }
export interface Order { id: string; reference: string; amount: number; currency: string; status: string; createdAt: string; hasActivePayment: boolean }
export interface Payment { id: string; status: string; providerReference?: string; redirectUrl?: string | null; createdAt: string; updatedAt: string }
export interface AuditEvent { id: string; eventType: string; occurredAt: string }
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number }
export interface AdminUser { id: string; username: string; enabled: boolean; roles: string[] }
export interface Role { id: string; name: string; permissions: string }
export interface Permission { name: string }
export interface SummaryTotals { orders: number; payments: number; pending: number; approved: number; rejected: number; unknown: number }
export interface SeriesDay { day: string; orders: number; pending: number; approved: number; rejected: number; unknown: number }
export interface DashboardSummary { updatedAt: string; totals: SummaryTotals; series: SeriesDay[]; amountsByCurrency: {currency:string;amount:number}[] }
export type ApiRequest = <T = unknown>(path: string, options?: RequestInit & { token?: string }) => Promise<T>;
