// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AmountInput, { amountSeparators, formatAmountInput, isValidPastedAmount, parseAmountInput } from './AmountInput';
import { CreateOrder } from './main';
import { celebrateOrder } from './celebration';

vi.hoisted(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) }); });
vi.mock('./celebration', () => ({ celebrateOrder: vi.fn(), stopCelebration: vi.fn() }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('formato y validación de importes', () => {
  it.each([
    ['es-CO', '1.234.567,89'], ['pt-BR', '1.234.567,89'], ['de-DE', '1.234.567,89'],
    ['fr-FR', '1\u202f234\u202f567,89'], ['en-US', '1,234,567.89'], ['ja-JP', '1,234,567.89'], ['zh-CN', '1,234,567.89'],
  ])('formatea y lee %s sin cambiar el valor', (language, formatted) => {
    const separators = amountSeparators(language);
    expect(formatAmountInput('1234567.89', separators)).toBe(formatted);
    expect(parseAmountInput(formatted, separators)).toBe('1234567.89');
    expect(isValidPastedAmount(formatted, separators)).toBe(true);
  });

  it('rechaza pegados ambiguos, caracteres no válidos y límites excedidos', () => {
    const separators = amountSeparators('es-CO');
    expect(isValidPastedAmount('1.234,567', separators)).toBe(false);
    expect(isValidPastedAmount('1,234.56', separators)).toBe(false);
    expect(isValidPastedAmount('12.34', separators)).toBe(false);
    expect(isValidPastedAmount('12345678901234', separators)).toBe(false);
    expect(isValidPastedAmount('-1', separators)).toBe(false);
    expect(isValidPastedAmount('1234567890123,45', separators)).toBe(true);
  });

  it('agrupa al escribir y permite borrar junto al separador', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    await user.type(input, '1234567,89');
    expect(input.value).toBe('1.234.567,89');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234567.89');
    input.setSelectionRange(2, 2);
    await user.keyboard('{Backspace}');
    expect(input.value).toBe('234.567,89');
    expect(onAmountChange).toHaveBeenLastCalledWith('234567.89');
  });

  it('conserva la posición de edición al insertar en medio del valor', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    await user.type(input, '1234,56');
    input.setSelectionRange(1, 1);
    await user.keyboard('9');
    expect(input.value).toBe('19.234,56');
    expect(input.selectionStart).toBe(2);
    expect(onAmountChange).toHaveBeenLastCalledWith('19234.56');
  });

  it('acepta punto decimal y coma de agrupación con idioma inglés', async () => {
    localStorage.setItem('pagoclaro.language', 'en');
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Amount<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;
    await user.type(input, '1234.56');
    expect(input.value).toBe('1,234.56');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234.56');
  });

  it('acepta pegado local y muestra un pegado ambiguo sin enviarlo', async () => {
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    input.focus();
    fireEvent.paste(input, { clipboardData: { getData: () => '1.234.567,89' } });
    expect(input.value).toBe('1.234.567,89');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234567.89');
    input.setSelectionRange(0, input.value.length);
    fireEvent.paste(input, { clipboardData: { getData: () => '1,234.56' } });
    expect(input.value).toBe('1,234.56');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234567.89');
    expect(input.validity.valid).toBe(false);
    expect(screen.getByRole('alert').textContent).toContain('13 dígitos');
  });

  it('mantiene visible e inválido un separador decimal incompatible hasta que se corrija', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    await user.type(input, '12.34');
    expect(input.value).toBe('12.34');
    expect(input.validity.valid).toBe(false);
    expect(onAmountChange).toHaveBeenLastCalledWith('12');
    await user.clear(input);
    await user.type(input, '12,34');
    expect(input.validity.valid).toBe(true);
    expect(onAmountChange).toHaveBeenLastCalledWith('12.34');
  });

  it.each(['Backspace', 'Delete'])('elimina solo el separador incorrecto con %s', async key => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    await user.type(input, '12.34');
    input.setSelectionRange(key === 'Backspace' ? 3 : 2, key === 'Backspace' ? 3 : 2);
    await user.keyboard(`{${key}}`);
    expect(input.value).toBe('1.234');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234');
    expect(input.validity.valid).toBe(true);
  });

  it('permite pegar dígitos dentro de un valor agrupado y los reagrupa', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();
    render(<label>Valor<AmountInput onAmountChange={onAmountChange} /></label>);
    const input = screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
    await user.type(input, '1234,56');
    input.setSelectionRange(2, 2);
    fireEvent.paste(input, { clipboardData: { getData: () => '5' } });
    expect(input.value).toBe('15.234,56');
    expect(onAmountChange).toHaveBeenLastCalledWith('15234.56');
  });

  it('envía el importe numérico correcto al crear la orden', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'test-order' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const created = vi.fn();
    render(<CreateOrder token="test" onClose={() => {}} onCreated={created} />);
    await user.type(screen.getByPlaceholderText('PED-2026-001'), 'PED-123');
    await user.type(screen.getByLabelText('Valor'), '1234567,89');
    await user.click(screen.getByRole('button', { name: 'Crear orden' }));
    await waitFor(() => expect(created).toHaveBeenCalled());
    expect(celebrateOrder).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({ reference: 'PED-123', amount: 1234567.89, currency: 'COP' });
  });

  it('no envía una orden cuando el importe tiene un formato ambiguo', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<CreateOrder token="test" onClose={() => {}} onCreated={() => {}} />);
    await user.type(screen.getByPlaceholderText('PED-2026-001'), 'PED-123');
    await user.type(screen.getByLabelText('Valor'), '12.34');
    await user.click(screen.getByRole('button', { name: 'Crear orden' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(celebrateOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('decimales');
  });

  it('no celebra si el servidor rechaza la orden', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Error' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
    render(<CreateOrder token="test" onClose={() => {}} onCreated={() => {}} />);
    await user.type(screen.getByPlaceholderText('PED-2026-001'), 'PED-123');
    await user.type(screen.getByLabelText('Valor'), '1234');
    await user.click(screen.getByRole('button', { name: 'Crear orden' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(celebrateOrder).not.toHaveBeenCalled();
  });

  it('reinicia el formulario al cerrar y volver a abrir el modal', async () => {
    const user = userEvent.setup();
    const props = { token: 'test', onClose: () => {}, onCreated: () => {} };
    const { rerender } = render(<CreateOrder {...props} open />);
    await user.type(screen.getByPlaceholderText('PED-2026-001'), 'PED-123');
    await user.type(screen.getByLabelText('Valor'), '1234');
    rerender(<CreateOrder {...props} open={false} />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    rerender(<CreateOrder {...props} open />);
    expect((screen.getByPlaceholderText('PED-2026-001') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Valor') as HTMLInputElement).value).toBe('');
  });
});
