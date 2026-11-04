// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) }); });
import MobileMenu from './MobileMenu';
import { Preferences } from './i18n';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(() => cleanup());

describe('menú móvil', () => {
  it('abre la navegación accesible, cambia de sección y cierra el menú', async () => {
    const navigate = vi.fn();
    render(<MobileMenu screen="orders" onNavigate={navigate} isAdmin username="operador" onLogout={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const menu = await screen.findByRole('dialog', { name: 'Navegación principal' });
    expect(within(menu).getByRole('button', { name: 'Órdenes' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(menu).getByRole('button', { name: 'Usuarios y roles' }));
    expect(navigate).toHaveBeenCalledWith('admin');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('no muestra administración a un usuario sin ese rol y permite cerrar con Escape', async () => {
    render(<MobileMenu screen="orders" onNavigate={vi.fn()} isAdmin={false} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const menu = await screen.findByRole('dialog');
    expect(within(menu).queryByRole('button', { name: 'Usuarios y roles' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sincroniza el tema con el selector de escritorio', async () => {
    render(<><Preferences /><MobileMenu screen="orders" onNavigate={vi.fn()} isAdmin={false} onLogout={vi.fn()} /></>);
    const desktopTheme = screen.getByLabelText('Apariencia') as HTMLSelectElement;
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const menu = await screen.findByRole('dialog');
    fireEvent.change(within(menu).getByLabelText('Apariencia'), { target: { value: 'dark' } });
    await waitFor(() => expect(desktopTheme.value).toBe('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
