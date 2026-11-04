import { tr } from './i18n';
import React, { useCallback, useEffect, useState } from 'react';
import Pager from './Pager';
import type { ApiRequest, AdminUser, Role, Permission, Page } from './types';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : tr('Error inesperado.');
export default function Admin({
  token,
  request
}: {
  token: string;
  request: ApiRequest;
}) {
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
  const [rolePage, setRolePage] = useState(0);
  const [roleSize, setRoleSize] = useState(10);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [u, r, p, first] = await Promise.all([request<Page<AdminUser>>(`/admin/users?page=${userPage}&size=${userSize}`, {
        token
      }), request<Page<Role>>(`/admin/roles?page=${rolePage}&size=${roleSize}`, {
        token
      }), request<Permission[]>('/admin/permissions', {
        token
      }), request<Page<Role>>('/admin/roles?page=0&size=100', {
        token
      })]);
      const remaining = await Promise.all(Array.from({
        length: Math.max(0, first.totalPages - 1)
      }, (_, i) => request<Page<Role>>(`/admin/roles?page=${i + 1}&size=100`, {
        token
      })));
      if (userPage > Math.max(0, u.totalPages - 1)) { setUserPage(Math.max(0, u.totalPages - 1)); return; }
      if (rolePage > Math.max(0, r.totalPages - 1)) { setRolePage(Math.max(0, r.totalPages - 1)); return; }
      setUsers(u.content);
      setUserTotal(u.totalElements);
      setRoles(r.content);
      setRoleTotal(r.totalElements);
      setRoleOptions([...(first.content || []), ...remaining.flatMap(page => page.content || [])]);
      setPermissions(p);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, request, userPage, userSize, rolePage, roleSize]);
  useEffect(() => {
    load();
  }, [load]);
  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/admin/users', {
        token,
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });
      setUsername('');
      setPassword('');
      await load();
      setNotice(tr("Usuario creado. Asígnale un rol para darle acceso."));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function createRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request('/admin/roles', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: roleName.trim(),
          permissions: selectedPermissions
        })
      });
      setRoleName('');
      setSelectedPermissions([]);
      await load();
      setNotice(tr("Rol creado correctamente."));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function changeRole(user: AdminUser, role: string, assigned: boolean) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request(`/admin/users/${user.id}/roles/${encodeURIComponent(role)}`, {
        token,
        method: assigned ? 'DELETE' : 'POST'
      });
      await load();
      setNotice(tr("Roles de {0} actualizados.", user.username));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  function userRoles(user: AdminUser) {
    return user.roles;
  }
  return <div className="admin-content"><div className="page-heading"><div><div className="breadcrumb">{"" + tr("OPERACIONES") + " "}<span>/</span>{" " + tr("ACCESOS") + ""}</div><h1>{tr("Usuarios y roles")}<span className="heading-dot">.</span></h1><p>{tr("Administra quién puede acceder y qué permisos tiene.")}</p></div><button className="button button-secondary" onClick={load} disabled={loading || busy}>{tr("Actualizar")}</button></div>{error && <div role="alert" className="alert alert-error">{error}</div>}{notice && <div role="status" className="alert alert-success">{notice}</div>}<div className="admin-grid"><section className="admin-card"><span className="eyebrow">{tr("ACCESO")}</span><h2>{tr("Crear usuario")}</h2><p>{tr("El usuario necesita un rol para operar.")}</p><form onSubmit={createUser}><label>{tr("Usuario")}<input required maxLength={100} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} /></label><label>{tr("Contraseña inicial")}<input required type="password" minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><small>{tr("Mínimo 12 caracteres.")}</small></label><button className="button button-primary" disabled={busy}>{tr("Crear usuario")}</button></form></section><section className="admin-card"><span className="eyebrow">{tr("PERMISOS")}</span><h2>{tr("Crear rol")}</h2><p>{tr("Define un nombre y selecciona sus permisos.")}</p><form onSubmit={createRole}><label>{tr("Nombre del rol")}<input required pattern="[A-Z][A-Z0-9_]{1,49}" title={tr("Usa mayúsculas, números o guion bajo; empieza por una letra.")} placeholder="OPERADOR" value={roleName} onChange={e => setRoleName(e.target.value.toUpperCase())} /></label><fieldset><legend>{tr("Permisos disponibles")}</legend>{loading ? <span className="skeleton admin-skeleton" /> : permissions.length ? permissions.map(p => <label className="check-label" key={p.name}><input type="checkbox" checked={selectedPermissions.includes(p.name)} onChange={e => setSelectedPermissions(current => e.target.checked ? [...current, p.name] : current.filter(x => x !== p.name))} />{p.name}</label>) : <small>{tr("No hay permisos disponibles.")}</small>}</fieldset><button className="button button-primary" disabled={busy || !selectedPermissions.length}>{tr("Crear rol")}</button></form></section></div><section className="admin-card admin-users"><span className="eyebrow">{tr("EQUIPO")}</span><h2>{tr("Usuarios y asignación de roles")}</h2><p>{tr("Selecciona los roles aplicables a cada usuario. El backend valida cada cambio.")}</p>{loading ? <div aria-label={tr("Cargando usuarios")}><span className="skeleton admin-skeleton" /><span className="skeleton admin-skeleton" /></div> : users.length ? users.map(user => <article className="admin-user" key={user.id}><div><strong>{user.username}</strong><small>{user.enabled ? tr("Activo") : tr("Inactivo")}</small></div><fieldset><legend className="sr-only">{tr("Roles de {0}", user.username)}</legend>{roleOptions.map(role => <label className="check-label" key={role.name}><input type="checkbox" checked={userRoles(user).includes(role.name)} disabled={busy} onChange={() => changeRole(user, role.name, userRoles(user).includes(role.name))} />{role.name}</label>)}</fieldset></article>) : <div className="empty small-empty"><strong>{tr("No hay usuarios para mostrar")}</strong><p>{tr("Crea el primer usuario para asignarle roles.")}</p></div>}{!loading && <Pager label={tr("usuarios")} total={userTotal} page={userPage} setPage={setUserPage} size={userSize} setSize={setUserSize} />}</section><section className="admin-card admin-users"><span className="eyebrow">{tr("CATÁLOGO")}</span><h2>{tr("Roles y permisos")}</h2>{loading ? <span className="skeleton admin-skeleton" /> : roles.length ? roles.map(role => <div className="role-row" key={role.id}><strong>{role.name}</strong><span>{role.permissions || tr("Sin permisos")}</span></div>) : <p>{tr("Aún no hay roles.")}</p>}{!loading && <Pager label={tr("roles")} total={roleTotal} page={rolePage} setPage={setRolePage} size={roleSize} setSize={setRoleSize} />}</section></div>;
}
