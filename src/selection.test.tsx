// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './main';
import type { Order } from './types';

vi.hoisted(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) }); });
const order = (id: string): Order => ({id,reference:`Orden ${id}`,amount:100,currency:'COP',status:'PENDING',createdAt:'2026-11-03T12:00:00Z',hasActivePayment:false});
const page = <T,>(content:T[]) => ({content,totalElements:content.length,totalPages:content.length?1:0,number:0,size:10});
const json = (data:unknown) => new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('pagoclaro.session',JSON.stringify({token:'demo',username:'admin',roles:['ADMIN'],permissions:['PAYMENTS_MANAGE']})); });
afterEach(() => {cleanup();vi.unstubAllGlobals();});
describe('selección concurrente de órdenes', () => {
  it('ignora una respuesta antigua y dirige el siguiente pago a la orden vigente', async () => {
    let resolveA!: (response:Response) => void;
    const slowA = new Promise<Response>(resolve => {resolveA=resolve;});
    const fetchMock = vi.fn((input:RequestInfo | URL, init?:RequestInit):Promise<Response> => {
      const url=String(input);
      if (url.includes('/dashboard/summary')) return Promise.resolve(json({updatedAt:'2026-11-03T12:00:00Z',totals:{orders:2,payments:0,pending:0,approved:0,rejected:0,unknown:0},series:[],amountsByCurrency:[]}));
      if (url.includes('/orders?')) return Promise.resolve(json(page([order('A'),order('B')])));
      if (url.endsWith('/orders/A')) return slowA;
      if (url.endsWith('/orders/B')) return Promise.resolve(json(order('B')));
      if (url.includes('/payments?') || url.includes('/events?')) return Promise.resolve(json(page([])));
      if (url.endsWith('/orders/B/payments') && init?.method === 'POST') return Promise.resolve(json({id:'pay-B',status:'PENDING'}));
      return Promise.resolve(new Response('',{status:404}));
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<App/>);
    fireEvent.click(await screen.findByText('Orden A'));
    await waitFor(() => expect(fetchMock.mock.calls.some(call=>String(call[0]).endsWith('/orders/A'))).toBe(true));
    fireEvent.click(screen.getByText('Orden B'));
    expect(await screen.findByRole('heading',{name:'Orden B'})).toBeTruthy();
    await act(async () => {resolveA(json(order('A'))); await Promise.resolve();});
    expect(screen.getByRole('heading',{name:'Orden B'})).toBeTruthy();
    const detail = screen.getByLabelText('Detalle de la orden');
    fireEvent.click(within(detail).getByRole('button',{name:'Iniciar pago'}));
    await waitFor(() => expect(fetchMock.mock.calls.some(call=>String(call[0]).endsWith('/orders/B/payments') && call[1]?.method==='POST')).toBe(true));
    expect(fetchMock.mock.calls.some(call=>String(call[0]).endsWith('/orders/A/payments') && call[1]?.method==='POST')).toBe(false);
  });
});
