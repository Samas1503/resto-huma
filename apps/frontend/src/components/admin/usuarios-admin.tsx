'use client';

// Admin de usuarios (empleados): alta con password, edición parcial (PATCH)
// y desactivación (DELETE /usuarios/:id → activo=false, revoca refresh tokens).
// El backend rechaza desactivarse o quitarse el rol admin a uno mismo.
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Rol } from '@resto-huma/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useRequireRol } from '@/lib/use-require-rol';
import type { UsuarioApi } from './api-types';
import { EmptyState, FormError, Select } from './fields';
import { errorMessage, useApiList } from './use-api-list';

const ROLES: { value: Rol; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'mozo', label: 'Mozo' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'repartidor', label: 'Repartidor' },
];

const rolLabel = (r: Rol) => ROLES.find((x) => x.value === r)?.label ?? r;

interface UsuarioDraft {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  activo: boolean;
}

const emptyUsuario: UsuarioDraft = {
  nombre: '',
  email: '',
  password: '',
  rol: 'mozo',
  activo: true,
};

function UsuarioForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: UsuarioApi | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<UsuarioDraft>(
    editing
      ? {
          nombre: editing.nombre,
          email: editing.email,
          password: '',
          rol: editing.rol,
          activo: editing.activo,
        }
      : emptyUsuario,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          nombre: draft.nombre.trim(),
          email: draft.email.trim(),
          rol: draft.rol,
          activo: draft.activo,
        };
        // Password vacío en edición = no cambiar (backend: opcional, min 8).
        if (draft.password) body.password = draft.password;
        await api.patch(`/usuarios/${editing.id}`, body);
      } else {
        await api.post('/usuarios', {
          nombre: draft.nombre.trim(),
          email: draft.email.trim(),
          password: draft.password,
          rol: draft.rol,
        });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Nombre"
          required
          value={draft.nombre}
          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
          placeholder="Ej.: María Pérez"
        />
        <Input
          label="Email"
          required
          type="email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder="nombre@resto.com"
        />
        <Input
          label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          required={!editing}
          type="password"
          minLength={8}
          value={draft.password}
          onChange={(e) => setDraft({ ...draft, password: e.target.value })}
          placeholder={editing ? 'Vacío = no cambiar' : 'Mínimo 8 caracteres'}
        />
        <Select
          label="Rol"
          value={draft.rol}
          onChange={(e) => setDraft({ ...draft, rol: e.target.value as Rol })}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      {editing && (
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={draft.activo}
            onChange={(e) => setDraft({ ...draft, activo: e.target.checked })}
            className="size-4 rounded border-zinc-300 accent-zinc-900"
          />
          Usuario activo
        </label>
      )}
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
        {editing && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export function UsuariosAdmin() {
  const { data: usuarios, loading, error, reload } = useApiList<UsuarioApi[]>('/usuarios');
  const [editing, setEditing] = useState<UsuarioApi | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { session } = useRequireRol('admin');

  async function desactivar(u: UsuarioApi) {
    if (!window.confirm(`¿Desactivar a ${u.nombre}? Se revocarán sus sesiones activas.`)) return;
    setActionError(null);
    try {
      await api.del(`/usuarios/${u.id}`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editar: ${editing.nombre}` : 'Nuevo usuario'}</CardTitle>
          <CardDescription>
            Empleados del sistema con su rol de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsuarioForm
            key={editing?.id ?? 'new'}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
            onCancel={() => setEditing(null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FormError message={error ?? actionError} />
          {loading ? (
            <EmptyState>Cargando usuarios…</EmptyState>
          ) : !usuarios || usuarios.length === 0 ? (
            <EmptyState>No hay usuarios.</EmptyState>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Email</TH>
                  <TH>Rol</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {usuarios.map((u) => {
                  const esMismo = session?.userId === u.id;
                  return (
                    <TR key={u.id}>
                      <TD className="font-medium text-zinc-900">
                        {u.nombre}
                        {esMismo && <span className="ml-2 text-xs text-zinc-400">(vos)</span>}
                      </TD>
                      <TD>{u.email}</TD>
                      <TD>
                        <Badge tone={u.rol === 'admin' ? 'violet' : 'blue'}>{rolLabel(u.rol)}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={u.activo ? 'green' : 'red'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                            Editar
                          </Button>
                          {u.activo && !esMismo && (
                            <Button size="sm" variant="ghost" onClick={() => desactivar(u)}>
                              Desactivar
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
