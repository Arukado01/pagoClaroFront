import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tr } from './i18n';
import Pager from './Pager';
import type { ApiRequest, AdminUser, Role, Permission, Page } from './types';
import './admin-access.css';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : tr('Error inesperado.');

function permissionDescription(name: string): string {
  if (name === 'PAYMENTS_READ') return tr('Consultar órdenes, pagos e indicadores.');
  if (name === 'PAYMENTS_MANAGE') return tr('Crear órdenes, iniciar pagos y conciliar.');
  return tr('Permiso de la plataforma.');
}

function PermissionOptions({ permissions, selected, onChange, lockManage = false, disabled = false }: {
  permissions: Permission[];
  selected: string[];
  onChange: (names: string[]) => void;
  lockManage?: boolean;
  disabled?: boolean;
}) {
  return <div className="permission-options">{permissions.map(permission => {
    const locked = lockManage && permission.name === 'PAYMENTS_MANAGE';
    return <label className="permission-option" key={permission.name}>
      <input type="checkbox" checked={selected.includes(permission.name)} disabled={disabled || locked}
        onChange={event => onChange(event.target.checked ? [...selected, permission.name] : selected.filter(name => name !== permission.name))} />
      <span><strong>{permission.name}</strong><small>{permissionDescription(permission.name)}</small></span>
    </label>;
  })}</div>;
}

function RolePermissionsEditor({ role, permissions, busy, onSave }: {
  role: Role;
  permissions: Permission[];
  busy: boolean;
  onSave: (name: string, values: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(() => role.permissions ? role.permissions.split(',').filter(Boolean) : []);
  useEffect(() => { setSelected(role.permissions ? role.permissions.split(',').filter(Boolean) : []); }, [role.permissions]);
  const initial = role.permissions ? role.permissions.split(',').filter(Boolean) : [];
  const changed = selected.length !== initial.length || selected.some(value => !initial.includes(value));
  return <article className="role-editor">
    <div className="role-editor-heading"><strong>{role.name}</strong><span>{role.permissions || tr('Sin permisos')}</span></div>
    {role.name === 'ADMIN' && <p className="role-explanation">{tr('ADMIN también administra usuarios y roles; debe conservar el permiso de gestión.')}</p>}
    <details>
      <summary>{tr('Editar permisos')}</summary>
      <form onSubmit={event => { event.preventDefault(); void onSave(role.name, selected); }}>
        <fieldset disabled={busy}>
          <legend>{tr('Permisos de {0}', role.name)}</legend>
          <PermissionOptions permissions={permissions} selected={selected} onChange={setSelected} lockManage={role.name === 'ADMIN'} disabled={busy} />
        </fieldset>
        <button className="button button-primary" type="submit" disabled={busy || !changed}>{tr('Guardar permisos')}</button>
      </form>
    </details>
  </article>;
}

export default function Admin({ token, request }: { token: string; request: ApiRequest }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [roleTotal, setRoleTotal] = useState(0);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [userSize, setUserSize] = useState(10);
  const [userQuery, setUserQuery] = useState('');
  const [rolePage, setRolePage] = useState(0);
  const [roleSize, setRoleSize] = useState(10);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('USER');
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const [u, r, p, first] = await Promise.all([
        request<Page<AdminUser>>(`/admin/users?page=${userPage}&size=${userSize}&q=${encodeURIComponent(userQuery.trim())}`, { token }),
        request<Page<Role>>(`/admin/roles?page=${rolePage}&size=${roleSize}`, { token }),
        request<Permission[]>('/admin/permissions', { token }),
        request<Page<Role>>('/admin/roles?page=0&size=100', { token }),
      ]);
      const remaining = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => request<Page<Role>>(`/admin/roles?page=${i + 1}&size=100`, { token })));
      if (current !== sequence.current) return false;
      if (userPage > Math.max(0, u.totalPages - 1)) { setUserPage(Math.max(0, u.totalPages - 1)); return false; }
      if (rolePage > Math.max(0, r.totalPages - 1)) { setRolePage(Math.max(0, r.totalPages - 1)); return false; }
      setUsers(u.content);
      setUserTotal(u.totalElements);
      setRoles(r.content);
      setRoleTotal(r.totalElements);
      setRoleOptions([...(first.content || []), ...remaining.flatMap(page => page.content || [])]);
      setPermissions(p);
      return true;
    } catch (err) {
      if (current === sequence.current) setError(errorMessage(err));
      return false;
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [token, request, userPage, userSize, userQuery, rolePage, roleSize]);
  useEffect(() => { void load(); return () => { sequence.current += 1; }; }, [load]);

  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try { await action(); if (await load()) setNotice(success); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate(async () => {
      await request('/admin/users', { token, method: 'POST', body: JSON.stringify({ username: username.trim(), password, role: userRole }) });
      setUsername(''); setPassword(''); setUserRole('USER');
    }, tr('Usuario creado con un rol asignado.'));
  }
  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate(async () => {
      await request('/admin/roles', { token, method: 'POST', body: JSON.stringify({ name: roleName.trim(), permissions: selectedPermissions }) });
      setRoleName(''); setSelectedPermissions([]);
    }, tr('Rol creado correctamente.'));
  }
  async function changeRole(user: AdminUser, role: string) {
    await mutate(() => request(`/admin/users/${user.id}/role`, { token, method: 'PUT', body: JSON.stringify({ role }) }), tr('Rol de {0} actualizado.', user.username));
  }
  async function savePermissions(name: string, values: string[]) {
    await mutate(() => request(`/admin/roles/${encodeURIComponent(name)}/permissions`, { token, method: 'PUT', body: JSON.stringify({ permissions: values }) }), tr('Permisos de {0} actualizados.', name));
  }

  return <div className="admin-content">
    <div className="page-heading"><div><div className="breadcrumb">{tr('OPERACIONES')} <span>/</span> {tr('ACCESOS')}</div><h1>{tr('Usuarios y roles')}<span className="heading-dot">.</span></h1><p>{tr('Administra quién puede acceder y qué permisos tiene.')}</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading || busy}>{tr('Actualizar')}</button></div>
    {error && <div role="alert" className="alert alert-error">{error}</div>}
    {notice && <div role="status" className="alert alert-success">{notice}</div>}
    <div className="admin-grid">
      <section className="admin-card"><span className="eyebrow">{tr('ACCESO')}</span><h2>{tr('Crear usuario')}</h2><p>{tr('Cada usuario tiene un solo rol.')}</p>
        <form onSubmit={createUser}>
          <label>{tr('Usuario')}<input required maxLength={100} autoComplete="off" value={username} onChange={event => setUsername(event.target.value)} /></label>
          <label>{tr('Contraseña inicial')}<input required type="password" minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /><small>{tr('Mínimo 12 caracteres.')}</small></label>
          <label>{tr('Rol')}<select className="admin-role-select" value={userRole} onChange={event => setUserRole(event.target.value)} disabled={busy || loading} required>{roleOptions.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label>
          <button className="button button-primary" disabled={busy || loading || !roleOptions.length}>{tr('Crear usuario')}</button>
        </form>
      </section>
      <section className="admin-card"><span className="eyebrow">{tr('PERMISOS')}</span><h2>{tr('Crear rol')}</h2><p>{tr('Define un nombre y selecciona sus permisos.')}</p>
        <form onSubmit={createRole}>
          <label>{tr('Nombre del rol')}<input required pattern="[A-Z][A-Z0-9_]{1,49}" title={tr('Usa mayúsculas, números o guion bajo; empieza por una letra.')} placeholder="OPERADOR" value={roleName} onChange={event => setRoleName(event.target.value.toUpperCase())} /></label>
          <fieldset><legend>{tr('Permisos disponibles')}</legend>{loading ? <span className="skeleton admin-skeleton" /> : permissions.length ? <PermissionOptions permissions={permissions} selected={selectedPermissions} onChange={setSelectedPermissions} disabled={busy} /> : <small>{tr('No hay permisos disponibles.')}</small>}</fieldset>
          <button className="button button-primary" disabled={busy || !selectedPermissions.length}>{tr('Crear rol')}</button>
        </form>
      </section>
    </div>
    <section className="admin-card admin-users"><span className="eyebrow">{tr('EQUIPO')}</span><h2>{tr('Usuarios y asignación de roles')}</h2><p>{tr('Selecciona un rol para cada usuario. El servidor valida cada cambio.')}</p>
      <label className="admin-user-search">{tr('Buscar usuarios')}<input type="search" value={userQuery} maxLength={100} disabled={busy} onChange={event => { setUserPage(0); setUserQuery(event.target.value); }} placeholder={tr('Buscar por usuario')} /></label>
      {loading ? <div aria-label={tr('Cargando usuarios')}><span className="skeleton admin-skeleton" /><span className="skeleton admin-skeleton" /></div> : users.length ? users.map(user => <article className="admin-user" key={user.id}>
        <div><strong>{user.username}</strong><small>{user.enabled ? tr('Activo') : tr('Inactivo')}</small></div>
        <label className="admin-user-role">{tr('Rol')}<select className="admin-role-select" aria-label={tr('Rol de {0}', user.username)} value={user.role ?? user.roles[0] ?? ''} disabled={busy} onChange={event => void changeRole(user, event.target.value)}>
          {!user.role && !user.roles.length && <option value="" disabled>{tr('Selecciona un rol')}</option>}
          {roleOptions.map(role => <option value={role.name} key={role.id}>{role.name}</option>)}
        </select></label>
      </article>) : <div className="empty small-empty"><strong>{tr('No hay usuarios para mostrar')}</strong><p>{userQuery.trim() ? tr('Ningún usuario coincide con la búsqueda.') : tr('Crea el primer usuario para asignarle un rol.')}</p></div>}
      {!loading && <Pager label={tr('usuarios')} total={userTotal} page={userPage} setPage={setUserPage} size={userSize} setSize={setUserSize} disabled={busy} />}
    </section>
    <section className="admin-card admin-users"><span className="eyebrow">{tr('CATÁLOGO')}</span><h2>{tr('Roles y permisos')}</h2><p>{tr('Consulta qué permite cada permiso y modifica los permisos de cada rol.')}</p>
      {loading ? <span className="skeleton admin-skeleton" /> : roles.length ? roles.map(role => <RolePermissionsEditor key={role.id} role={role} permissions={permissions} busy={busy} onSave={savePermissions} />) : <p>{tr('Aún no hay roles.')}</p>}
      {!loading && <Pager label={tr('roles')} total={roleTotal} page={rolePage} setPage={setRolePage} size={roleSize} setSize={setRoleSize} disabled={busy} />}
    </section>
  </div>;
}
