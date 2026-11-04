// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admin from './Admin';
import type { ApiRequest } from './types';

vi.hoisted(() => { Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) }); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function adminApi(options: { waitRole?: Promise<void>; failRefresh?: boolean } = {}) {
  const users = [{ id: 'u1', username: 'alex', enabled: true, role: 'USER', roles: ['USER'] }];
  const roles = [{ id: 'r1', name: 'USER', permissions: 'PAYMENTS_READ' }, { id: 'r2', name: 'ADMIN', permissions: 'PAYMENTS_MANAGE' }];
  const permissions = [{ name: 'PAYMENTS_READ' }, { name: 'PAYMENTS_MANAGE' }];
  const page = <T,>(items: T[]) => ({ content: items, number: 0, size: 10, totalElements: items.length, totalPages: items.length ? 1 : 0 });
  let changedRole = false;
  const request = vi.fn(async (path: string, init?: RequestInit & { token?: string }): Promise<unknown> => {
    if (path.startsWith('/admin/users?')) {
      if (changedRole && options.failRefresh) throw new Error('No se pudo actualizar la lista');
      const search = new URL(`https://example.test${path}`).searchParams.get('q')?.toLowerCase() || '';
      return page(users.filter(user => user.username.toLowerCase().includes(search)));
    }
    if (path.startsWith('/admin/roles?')) return page(roles);
    if (path === '/admin/permissions') return permissions;
    if (path === '/admin/users/u1/role' && init?.method === 'PUT') {
      if (options.waitRole) await options.waitRole;
      users[0].role = JSON.parse(String(init.body)).role;
      users[0].roles = [users[0].role];
      changedRole = true;
      return undefined;
    }
    if (path === '/admin/roles/USER/permissions' && init?.method === 'PUT') {
      roles[0].permissions = JSON.parse(String(init.body)).permissions.join(',');
      return undefined;
    }
    if (path === '/admin/users' && init?.method === 'POST') return { id: 'u2' };
    throw new Error(`Unexpected request: ${path}`);
  });
  return { request, api: request as unknown as ApiRequest };
}

describe('administración de acceso', () => {
  it('busca usuarios en el servidor y asigna exactamente un rol', async () => {
    const user = userEvent.setup();
    const { request, api } = adminApi();
    render(<Admin token="token" request={api} />);
    const roleSelect = await screen.findByRole('combobox', { name: 'Rol de alex' });
    expect((roleSelect as HTMLSelectElement).value).toBe('USER');
    await user.selectOptions(roleSelect, 'ADMIN');
    await waitFor(() => expect(request).toHaveBeenCalledWith('/admin/users/u1/role', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ role: 'ADMIN' }) })));
    expect((await screen.findByRole('combobox', { name: 'Rol de alex' }) as HTMLSelectElement).value).toBe('ADMIN');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar usuarios' }), { target: { value: 'alex' } });
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.stringContaining('/admin/users?page=0&size=10&q=alex'), expect.anything()));
  });

  it('crea usuarios con un solo rol y permite editar permisos de un rol', async () => {
    const user = userEvent.setup();
    const { request, api } = adminApi();
    render(<Admin token="token" request={api} />);
    await screen.findByRole('combobox', { name: 'Rol de alex' });
    await user.type(screen.getByLabelText('Usuario'), 'nuevo');
    await user.type(screen.getByLabelText(/Contraseña inicial/), 'contrasena-segura');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Rol' }), 'USER');
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/admin/users', expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'nuevo', password: 'contrasena-segura', role: 'USER' }) })));
    const userEditor = screen.getByText('USER', { selector: '.role-editor-heading strong' }).closest('article');
    expect(userEditor).not.toBeNull();
    await user.click(within(userEditor as HTMLElement).getByText('Editar permisos'));
    await user.click(within(userEditor as HTMLElement).getByRole('checkbox', { name: /PAYMENTS_READ/ }));
    await user.click(within(userEditor as HTMLElement).getByRole('button', { name: 'Guardar permisos' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/admin/roles/USER/permissions', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ permissions: [] }) })));
  });

  it('deshabilita la búsqueda mientras se guarda un cambio de rol', async () => {
    let resolveRole!: () => void;
    const waitRole = new Promise<void>(resolve => { resolveRole = resolve; });
    const { api } = adminApi({ waitRole });
    render(<Admin token="token" request={api} />);
    const roleSelect = await screen.findByRole('combobox', { name: 'Rol de alex' });
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });
    expect((screen.getByRole('searchbox', { name: 'Buscar usuarios' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('spinbutton', { name: 'Seleccionar página de usuarios' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('spinbutton', { name: 'Seleccionar página de roles' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: 'Cantidad de usuarios por página' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: 'Cantidad de roles por página' }) as HTMLButtonElement).disabled).toBe(true);
    resolveRole();
    await waitFor(() => expect((screen.getByRole('searchbox', { name: 'Buscar usuarios' }) as HTMLInputElement).disabled).toBe(false));
  });

  it('no muestra éxito si la recarga posterior de la lista falla', async () => {
    const { api } = adminApi({ failRefresh: true });
    render(<Admin token="token" request={api} />);
    const roleSelect = await screen.findByRole('combobox', { name: 'Rol de alex' });
    fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo actualizar la lista');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
