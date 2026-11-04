// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import type { ApiRequest, DashboardSummary } from './types';

const media = vi.hoisted(() => ({ matches: false, listeners: new Set<() => void>() }));
vi.hoisted(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ get matches() { return media.matches; }, addEventListener: (_: string, listener: () => void) => media.listeners.add(listener), removeEventListener: (_: string, listener: () => void) => media.listeners.delete(listener) }) }); });
import { Preferences, language, locale, tr } from './i18n';
import { translations } from './translations';
import Dashboard from './Dashboard';

beforeEach(() => { cleanup(); localStorage.clear(); media.matches = false; media.listeners.clear(); });
describe('preferencias e idiomas', () => {
  it('persiste el tema seleccionado y sigue los cambios del sistema', () => {
    render(<Preferences/>); const select = screen.getByLabelText('Apariencia') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'dark' } });
    expect(localStorage.getItem('pagoclaro.theme')).toBe('dark'); expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.change(select, { target: { value: 'system' } }); media.matches = true; media.listeners.forEach(listener => listener());
    expect(document.documentElement.dataset.theme).toBe('dark'); media.matches = false; media.listeners.forEach(listener => listener()); expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('usa el idioma persistido y el formato regional correspondiente', () => {
    localStorage.setItem('pagoclaro.language','ja'); expect(language()).toBe('ja'); expect(locale()).toBe('ja-JP'); expect(tr('Iniciar sesión')).toBe(translations.ja['Iniciar sesión']);
    localStorage.setItem('pagoclaro.language','zh'); expect(locale()).toBe('zh-CN');
  });
  it('mantiene las mismas claves en los seis catálogos traducidos', () => {
    const keys = Object.keys(translations.en).sort();
    for (const lang of ['pt','de','fr','ja','zh'] as const) expect(Object.keys(translations[lang]).sort()).toEqual(keys);
  });
});
describe('tablero', () => {
  const summary: DashboardSummary = {updatedAt:'2026-11-03T12:00:00Z',totals:{orders:3,payments:2,pending:1,approved:1,rejected:0,unknown:0},series:[{day:'2026-11-03',orders:3,pending:1,approved:1,rejected:0,unknown:0}],amountsByCurrency:[]};
  it('representa agregados reales de la API', async () => {
    const request: ApiRequest = async <T,>() => summary as T;
    render(<Dashboard token="test" request={request} refreshKey={0}/>);
    expect(await screen.findByText('Estado de los pagos')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('intentos registrados')).toBeTruthy());
    expect(screen.getByText('Órdenes creadas por fecha durante los últimos 30 días')).toBeTruthy();
  });
  it('expone error y no interpreta la falta de respuesta como cero', async () => {
    const request: ApiRequest = async () => {throw new Error('sin conexión');};
    render(<Dashboard token="test" request={request} refreshKey={0}/>);
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.getAllByText('—')).toHaveLength(4);
  });
});
