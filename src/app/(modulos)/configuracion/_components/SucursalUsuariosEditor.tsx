'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { OpcionesAsignacion } from '../../../../lib/api/sucursal.client';
import styles from './SucursalUsuariosEditor.module.css';

/** Una fila de la lista de asignaciones que se está editando. */
export interface FilaAsignacion {
  usuarioId: string;
  nombre: string;
  email: string | null;
  rolId: string;
  esActual: boolean;
}

interface SucursalUsuariosEditorProps {
  opciones: OpcionesAsignacion | null;
  asignaciones: FilaAsignacion[];
  onChange: (asignaciones: FilaAsignacion[]) => void;
  /** Al crear, quien crea queda asignado como Administrador sin figurar en la lista. */
  creando: boolean;
  cargando: boolean;
  disabled: boolean;
}

export default function SucursalUsuariosEditor({
  opciones,
  asignaciones,
  onChange,
  creando,
  cargando,
  disabled,
}: SucursalUsuariosEditorProps) {
  const [nuevoUsuarioId, setNuevoUsuarioId] = useState('');
  const [nuevoRolId, setNuevoRolId] = useState('');

  const puedeAdministrar = opciones?.puedeAdministrar ?? false;
  const roles = opciones?.roles ?? [];
  const yo = opciones?.usuarios.find((u) => u.esActual);
  const asignados = new Set(asignaciones.map((a) => a.usuarioId));
  // Uno mismo no se agrega: al crear entra solo y al editar ya está en la lista.
  const disponibles = (opciones?.usuarios ?? []).filter((u) => !u.esActual && !asignados.has(u.id));
  const nombreRol = (id: string) => roles.find((r) => r.id === id)?.nombre ?? '—';

  const cambiarRol = (usuarioId: string, rolId: string) =>
    onChange(asignaciones.map((a) => (a.usuarioId === usuarioId ? { ...a, rolId } : a)));

  const quitar = (usuarioId: string) => onChange(asignaciones.filter((a) => a.usuarioId !== usuarioId));

  const agregar = () => {
    const usuario = disponibles.find((u) => u.id === nuevoUsuarioId);
    if (!usuario || !nuevoRolId) return;
    onChange([
      ...asignaciones,
      { usuarioId: usuario.id, nombre: usuario.nombre, email: usuario.email, rolId: nuevoRolId, esActual: false },
    ]);
    setNuevoUsuarioId('');
    setNuevoRolId('');
  };

  return (
    <div className={styles.container}>
      <span className={styles.titulo}>Usuarios asignados</span>

      {cargando || !opciones ? (
        <p className={styles.hint}>Cargando usuarios...</p>
      ) : (
        <>
          <ul className={styles.lista}>
            {creando && yo && (
              <li className={styles.fila}>
                <span className={styles.usuario}>
                  <span className={styles.nombre}>{yo.nombre} (vos)</span>
                  {yo.email && <span className={styles.email}>{yo.email}</span>}
                </span>
                <span className={styles.rolFijo}>Administrador</span>
                <span className={styles.accion} />
              </li>
            )}
            {asignaciones.map((a) => {
              const editable = puedeAdministrar && !a.esActual;
              return (
                <li key={a.usuarioId} className={styles.fila}>
                  <span className={styles.usuario}>
                    <span className={styles.nombre}>
                      {a.nombre}
                      {a.esActual && ' (vos)'}
                    </span>
                    {a.email && <span className={styles.email}>{a.email}</span>}
                  </span>
                  {editable ? (
                    <select
                      className={styles.select}
                      value={a.rolId}
                      onChange={(e) => cambiarRol(a.usuarioId, e.target.value)}
                      disabled={disabled}
                      aria-label={`Rol de ${a.nombre}`}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={styles.rolFijo}
                      title={a.esActual && puedeAdministrar ? 'No podés cambiar tu propio rol ni quitarte de la sucursal.' : undefined}
                    >
                      {nombreRol(a.rolId)}
                    </span>
                  )}
                  <span className={styles.accion}>
                    {editable && (
                      <button
                        type="button"
                        className={styles.btnQuitar}
                        onClick={() => quitar(a.usuarioId)}
                        disabled={disabled}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Quitar
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
            {!creando && asignaciones.length === 0 && (
              <li className={styles.hint}>No hay usuarios asignados.</li>
            )}
          </ul>

          {creando && <p className={styles.hint}>Quien crea la sucursal queda asignado como Administrador.</p>}

          {puedeAdministrar ? (
            disponibles.length > 0 ? (
              <div className={styles.agregar}>
                <select
                  className={styles.select}
                  value={nuevoUsuarioId}
                  onChange={(e) => setNuevoUsuarioId(e.target.value)}
                  disabled={disabled}
                  aria-label="Usuario a asignar"
                >
                  <option value="">Elegí un usuario</option>
                  {disponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                      {u.email ? ` (${u.email})` : ''}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={nuevoRolId}
                  onChange={(e) => setNuevoRolId(e.target.value)}
                  disabled={disabled}
                  aria-label="Rol en la sucursal"
                >
                  <option value="">Elegí un rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.btnAgregar}
                  onClick={agregar}
                  disabled={disabled || !nuevoUsuarioId || !nuevoRolId}
                >
                  <Plus size={15} aria-hidden="true" />
                  Agregar
                </button>
              </div>
            ) : (
              <p className={styles.hint}>Todos los usuarios de la empresa ya están asignados.</p>
            )
          ) : (
            <p className={styles.hint}>Solo un administrador puede asignar o quitar usuarios.</p>
          )}
        </>
      )}
    </div>
  );
}
