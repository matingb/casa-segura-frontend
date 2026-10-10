'use client';

import { useMemo, useState } from 'react';
import { Tag } from 'lucide-react';
import { ClienteDescuentoCategoria } from '../../../../../lib/types/Region';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatARS, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import Select from '../../../../../components/ui/Select/Select';
import ConfirmActionModal from '../../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import InputPorcentaje, { validarPorcentaje } from '../../../../../components/ui/InputPorcentaje/InputPorcentaje';
import { ItemConMargenCalculado } from '../../../../../lib/types/ListaPreciosCliente';
import { ListaPreciosClienteEstado } from '../ListaPreciosCliente/useListaPreciosCliente';
import { simularPrecio } from '../ListaPreciosCliente/simularPrecio';
import PorcentajeEditable from './PorcentajeEditable';
import styles from './ClienteDescuentos.module.css';

interface Props {
  clienteId: string;
  categorias: ClienteDescuentoCategoria[];
  lista: ListaPreciosClienteEstado;
  onChanged: () => Promise<void> | void;
}

type Destino = { modo: 'tipo' | 'subtipo'; id: string };

/**
 * Productos a los que llega un descuento de categoría. En el cálculo, el descuento
 * de una subcategoría tiene prioridad sobre el de su categoría (no se suman).
 */
function productosAfectados(items: ItemConMargenCalculado[], destino: Destino, subtiposConDescuento: Set<string>) {
  return destino.modo === 'subtipo'
    ? items.filter(i => i.subtipoId === destino.id)
    : items.filter(i => i.tipoId === destino.id && !(i.subtipoId && subtiposConDescuento.has(i.subtipoId)));
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export default function DescuentoCategoriaEditor({ clienteId, categorias, lista, onChanged }: Props) {
  const { showSuccess, showError } = useToast();
  const { tipos, subtipos, getSubtiposPorTipo } = useClasificacion();
  const [modo, setModo] = useState<'tipo' | 'subtipo'>('tipo');
  const [tipoId, setTipoId] = useState('');
  const [subtipoId, setSubtipoId] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aQuitar, setAQuitar] = useState<ClienteDescuentoCategoria | null>(null);
  const [quitando, setQuitando] = useState(false);

  const subtiposConDescuento = useMemo(() => new Set(categorias.filter(c => c.subtipoId).map(c => c.subtipoId!)), [categorias]);
  const sucursalNombre = lista.datos?.sucursal.nombre ?? 'este punto de venta';
  const destino: Destino | null = modo === 'tipo' ? (tipoId ? { modo, id: tipoId } : null) : (subtipoId ? { modo, id: subtipoId } : null);
  const existente = destino ? categorias.find(c => (destino.modo === 'tipo' ? c.tipoId === destino.id && !c.subtipoId : c.subtipoId === destino.id)) : undefined;
  const { valor, error } = validarPorcentaje(porcentaje);
  const afectados = destino ? productosAfectados(lista.items, destino, subtiposConDescuento) : [];
  const excluidosPorSubcategoria = destino?.modo === 'tipo' ? lista.items.filter(i => i.tipoId === destino.id).length - afectados.length : 0;
  const ejemplo = afectados[0];
  const vistaPrevia = ejemplo && valor != null ? simularPrecio(ejemplo, { 'categoria-cliente': valor }) : null;
  const debajoDelMargen = valor != null ? afectados.filter(i => simularPrecio(i, { 'categoria-cliente': valor }).debajoDelMargen).length : 0;
  const puedeAsignar = Boolean(destino) && valor != null && !guardando && valor !== (existente ? Number(existente.porcentaje) : null);

  const limpiar = () => { setTipoId(''); setSubtipoId(''); setPorcentaje(''); setNota(''); };

  const asignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeAsignar || !destino || valor == null) return;
    setGuardando(true);
    try {
      await clienteDescuentoClient.asignarCategoria(clienteId, {
        tipo_id: destino.modo === 'tipo' ? destino.id : undefined,
        subtipo_id: destino.modo === 'subtipo' ? destino.id : undefined,
        porcentaje: valor,
        nota: nota.trim() || existente?.nota || undefined,
      });
      showSuccess(existente ? 'Descuento reemplazado' : 'Descuento asignado');
      limpiar();
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo asignar el descuento.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPorcentaje = async (c: ClienteDescuentoCategoria, nuevo: number) => {
    try {
      await clienteDescuentoClient.asignarCategoria(clienteId, {
        tipo_id: c.subtipoId ? undefined : c.tipoId ?? undefined,
        subtipo_id: c.subtipoId ?? undefined,
        porcentaje: nuevo,
        nota: c.nota ?? undefined,
      });
      showSuccess('Descuento actualizado');
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo actualizar el descuento.');
      throw err;
    }
  };

  const quitar = async () => {
    if (!aQuitar) return;
    setQuitando(true);
    try {
      await clienteDescuentoClient.quitarCategoria(clienteId, aQuitar.id);
      showSuccess('Descuento quitado');
      setAQuitar(null);
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo quitar el descuento.');
    } finally {
      setQuitando(false);
    }
  };

  const nombreCategoria = (c: ClienteDescuentoCategoria) => (c.subtipoId ? c.subtipoNombre : c.tipoNombre) ?? 'Categoría';
  const afectadosDe = (c: ClienteDescuentoCategoria) =>
    productosAfectados(lista.items, c.subtipoId ? { modo: 'subtipo', id: c.subtipoId } : { modo: 'tipo', id: c.tipoId ?? '' }, subtiposConDescuento).length;

  return (
    <div className={styles.nivel}>
      <form onSubmit={asignar} className={styles.formulario}>
        <div className={styles.modoGrupo} role="radiogroup" aria-label="Aplicar a">
          <label className={styles.modoOpcion}>
            <input type="radio" name="modo-categoria" checked={modo === 'tipo'} onChange={() => { setModo('tipo'); setSubtipoId(''); }} />
            Una categoría completa
          </label>
          <label className={styles.modoOpcion}>
            <input type="radio" name="modo-categoria" checked={modo === 'subtipo'} onChange={() => setModo('subtipo')} />
            Una subcategoría
          </label>
        </div>
        <div className={styles.formGrid}>
          {modo === 'tipo' ? (
            <div className={styles.campoAncho}>
              <Select id="descuento-categoria" label="Categoría" value={tipoId} onChange={(e) => setTipoId(e.target.value)} disabled={guardando}>
                <option value="">Elegí una categoría</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </Select>
            </div>
          ) : (
            <div className={styles.campoAncho}>
              <Select id="descuento-subcategoria" label="Subcategoría" value={subtipoId} onChange={(e) => setSubtipoId(e.target.value)} disabled={guardando}>
                <option value="">Elegí una subcategoría</option>
                {tipos.map(t => {
                  const hijos = getSubtiposPorTipo(t.id);
                  return hijos.length ? (
                    <optgroup key={t.id} label={t.nombre}>
                      {hijos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </optgroup>
                  ) : null;
                })}
                {subtipos.filter(s => !tipos.some(t => t.id === s.tipoId)).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            </div>
          )}
          <InputPorcentaje id="descuento-categoria-pct" label="Descuento" placeholder="Ej: 10" value={porcentaje} onChange={setPorcentaje} error={error} disabled={guardando} />
          <label className={styles.campo}>
            <span className={styles.campoLabel}>Nota (opcional)</span>
            <input className={styles.input} placeholder="Ej: Instalador frecuente" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} disabled={guardando} />
          </label>
          <button type="submit" className={styles.btnAsignar} disabled={!puedeAsignar}>
            {existente ? 'Reemplazar' : 'Asignar'}
          </button>
        </div>

        {destino && (
          <div className={styles.contexto} aria-live="polite">
            {existente && (
              <p className={styles.avisoReemplazo}>
                Esta {modo === 'tipo' ? 'categoría' : 'subcategoría'} ya tiene {formatPorcentaje(Number(existente.porcentaje))}. Si asignás otro valor, se reemplaza.
              </p>
            )}
            <p>
              Se aplica a {plural(afectados.length, 'producto', 'productos')} de {sucursalNombre}.
              {excluidosPorSubcategoria > 0 && ` ${plural(excluidosPorSubcategoria, 'producto tiene', 'productos tienen')} un descuento propio de subcategoría, que tiene prioridad.`}
            </p>
            {ejemplo && vistaPrevia && (
              <p className={styles.vistaPrevia}>
                Ejemplo: {ejemplo.nombre} pasa de {formatARS(ejemplo.precioFinalArs)} a <strong>{formatARS(vistaPrevia.precioFinal)}</strong> ({formatPorcentaje(vistaPrevia.descuentoTotal)} total)
              </p>
            )}
            {debajoDelMargen > 0 && (
              <p className={styles.avisoMargen}>
                Con este descuento, {plural(debajoDelMargen, 'producto quedaría', 'productos quedarían')} debajo del margen mínimo: en esos se cobra el precio mínimo permitido.
              </p>
            )}
          </div>
        )}
      </form>

      {categorias.length === 0 ? (
        <div className={styles.vacio}>
          <Tag size={28} aria-hidden />
          <p>Este cliente todavía no tiene descuentos por categoría. Usalo para darle un precio especial en un rubro completo.</p>
        </div>
      ) : (
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th className={styles.num}>Descuento</th>
                <th className={styles.num} title={`Productos de ${sucursalNombre} que reciben este descuento`}>Productos</th>
                <th>Nota</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {categorias.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.nombre}>{nombreCategoria(c)}</div>
                    <div className={styles.secundario}>{c.subtipoId ? `Subcategoría de ${c.categoriaPadreNombre ?? 'otra categoría'}` : 'Categoría completa'}</div>
                  </td>
                  <td className={styles.num}>
                    <PorcentajeEditable id={`pct-${c.id}`} valor={Number(c.porcentaje)} etiqueta={`descuento de ${nombreCategoria(c)}`} onGuardar={(n) => cambiarPorcentaje(c, n)} />
                  </td>
                  <td className={styles.num}>{afectadosDe(c)}</td>
                  <td className={styles.nota}>{c.nota || <span className={styles.muted}>—</span>}</td>
                  <td className={styles.acciones}>
                    <button type="button" className={styles.btnQuitar} onClick={() => setAQuitar(c)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aQuitar && (
        <ConfirmActionModal
          title="Quitar descuento"
          description={`¿Quitar el descuento de ${nombreCategoria(aQuitar)}? ${plural(afectadosDe(aQuitar), 'producto vuelve', 'productos vuelven')} a su precio sin este descuento.`}
          confirmLabel="Quitar"
          isConfirming={quitando}
          onConfirm={quitar}
          onClose={() => setAQuitar(null)}
        />
      )}
    </div>
  );
}
