'use client';

import { useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { ClienteDescuentoProducto } from '../../../../../lib/types/Region';
import { Producto } from '../../../../../lib/types/Producto';
import { productoClient } from '../../../../../lib/api/producto.client';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatARS, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import Combobox from '../../../../../components/ui/Combobox/Combobox';
import ConfirmActionModal from '../../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import InputPorcentaje, { validarPorcentaje } from '../../../../../components/ui/InputPorcentaje/InputPorcentaje';
import { ListaPreciosClienteEstado } from '../ListaPreciosCliente/useListaPreciosCliente';
import { origenDescuentos, simularPrecio } from '../ListaPreciosCliente/simularPrecio';
import PorcentajeEditable from './PorcentajeEditable';
import styles from './ClienteDescuentos.module.css';

interface Props {
  clienteId: string;
  productos: ClienteDescuentoProducto[];
  lista: ListaPreciosClienteEstado;
  onChanged: () => Promise<void> | void;
}

export default function DescuentoProductoEditor({ clienteId, productos, lista, onChanged }: Props) {
  const { showSuccess, showError } = useToast();
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [productoId, setProductoId] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aQuitar, setAQuitar] = useState<ClienteDescuentoProducto | null>(null);
  const [quitando, setQuitando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    productoClient.obtenerTodos({ operativo: true })
      .then(data => { if (!cancelado) setCatalogo(data); })
      .catch(() => { if (!cancelado) showError('No se pudo cargar el catálogo de productos.'); })
      .finally(() => { if (!cancelado) setCargandoCatalogo(false); });
    return () => { cancelado = true; };
  }, [showError]);

  const itemPorProducto = useMemo(() => new Map(lista.items.map(i => [i.productoId, i])), [lista.items]);
  const sucursalNombre = lista.datos?.sucursal.nombre ?? 'este punto de venta';

  const opciones = useMemo(() => catalogo.map(p => {
    const precio = itemPorProducto.get(p.id)?.precioListaArs ?? p.precioBase;
    return { value: p.id, label: [p.codigo, p.nombre, p.marca, precio != null ? formatARS(precio) : null].filter(Boolean).join(' · ') };
  }), [catalogo, itemPorProducto]);

  const { valor, error } = validarPorcentaje(porcentaje);
  const item = productoId ? itemPorProducto.get(productoId) : undefined;
  const existente = productos.find(p => p.productoId === productoId);
  const sinProducto = item ? simularPrecio(item, { 'producto-cliente': null }) : null;
  const vistaPrevia = item && valor != null ? simularPrecio(item, { 'producto-cliente': valor }) : null;
  const puedeAsignar = Boolean(productoId) && valor != null && !guardando && valor !== (existente ? Number(existente.porcentaje) : null);

  const limpiar = () => { setProductoId(''); setPorcentaje(''); setNota(''); };

  const asignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeAsignar || valor == null) return;
    setGuardando(true);
    try {
      await clienteDescuentoClient.asignarProducto(clienteId, { producto_id: productoId, porcentaje: valor, nota: nota.trim() || existente?.nota || undefined });
      showSuccess(existente ? 'Descuento reemplazado' : 'Descuento asignado');
      limpiar();
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo asignar el descuento.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPorcentaje = async (p: ClienteDescuentoProducto, nuevo: number) => {
    try {
      await clienteDescuentoClient.asignarProducto(clienteId, { producto_id: p.productoId, porcentaje: nuevo, nota: p.nota ?? undefined });
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
      await clienteDescuentoClient.quitarProducto(clienteId, aQuitar.id);
      showSuccess('Descuento quitado');
      setAQuitar(null);
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo quitar el descuento.');
    } finally {
      setQuitando(false);
    }
  };

  const itemAQuitar = aQuitar ? itemPorProducto.get(aQuitar.productoId) : undefined;
  const precioSinDescuento = itemAQuitar ? simularPrecio(itemAQuitar, { 'producto-cliente': null }).precioFinal : null;

  return (
    <div className={styles.nivel}>
      <form onSubmit={asignar} className={styles.formulario}>
        <div className={styles.formGrid}>
          <div className={styles.campoAncho}>
            <Combobox
              label="Producto"
              options={opciones}
              value={productoId}
              onChange={setProductoId}
              placeholder={cargandoCatalogo ? 'Cargando productos…' : 'Buscá por código, nombre o marca'}
              disabled={cargandoCatalogo || guardando}
              loading={cargandoCatalogo}
            />
          </div>
          <InputPorcentaje id="descuento-producto" label="Descuento" placeholder="Ej: 15" value={porcentaje} onChange={setPorcentaje} error={error} disabled={guardando} />
          <label className={styles.campo}>
            <span className={styles.campoLabel}>Nota (opcional)</span>
            <input className={styles.input} placeholder="Ej: Licitación municipal" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} disabled={guardando} />
          </label>
          <button type="submit" className={styles.btnAsignar} disabled={!puedeAsignar}>
            {existente ? 'Reemplazar' : 'Asignar'}
          </button>
        </div>

        {productoId && (
          <div className={styles.contexto} aria-live="polite">
            {existente && (
              <p className={styles.avisoReemplazo}>
                Este producto ya tiene {formatPorcentaje(Number(existente.porcentaje))} por producto. Si asignás otro valor, se reemplaza.
              </p>
            )}
            {item && sinProducto ? (
              <>
                <p>
                  {sinProducto.descuentoTotal > 0
                    ? `Ya tiene ${formatPorcentaje(sinProducto.descuentoTotal)} por ${origenDescuentos(item, 'producto-cliente')}`
                    : 'Sin otros descuentos'}
                  {' · '}Precio actual: <strong>{formatARS(item.precioFinalArs)}</strong>
                </p>
                {vistaPrevia && (
                  <p className={styles.vistaPrevia}>
                    Precio final: <strong>{formatARS(vistaPrevia.precioFinal)}</strong> ({formatPorcentaje(vistaPrevia.descuentoTotal)} total)
                  </p>
                )}
                {vistaPrevia?.debajoDelMargen && (
                  <p className={styles.avisoMargen}>Con este descuento quedaría debajo del margen mínimo, así que se cobra el precio mínimo permitido.</p>
                )}
              </>
            ) : (
              <p className={styles.muted}>Este producto no se vende en {sucursalNombre}: no se puede mostrar cómo queda el precio acá.</p>
            )}
          </div>
        )}
      </form>

      {productos.length === 0 ? (
        <div className={styles.vacio}>
          <Package size={28} aria-hidden />
          <p>Este cliente todavía no tiene descuentos por producto. Usalo para licitaciones o acuerdos especiales.</p>
        </div>
      ) : (
        <div className={styles.tablaScroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Producto</th>
                <th className={styles.num}>Descuento propio</th>
                <th className={styles.num} title={`Con todos los descuentos del cliente, en ${sucursalNombre}`}>Descuento total</th>
                <th className={styles.num} title={`Precio en ${sucursalNombre}`}>Precio final</th>
                <th>Nota</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {productos.map(p => {
                const fila = itemPorProducto.get(p.productoId);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.nombre}>{p.productoNombre}</div>
                      <div className={styles.secundario}>{p.productoCodigo}</div>
                    </td>
                    <td className={styles.num}>
                      <PorcentajeEditable id={`pct-${p.id}`} valor={Number(p.porcentaje)} etiqueta={`descuento de ${p.productoNombre}`} onGuardar={(n) => cambiarPorcentaje(p, n)} />
                    </td>
                    <td className={styles.num}>{fila ? formatPorcentaje(fila.descuentoTotalPorcentaje) : <span className={styles.muted}>—</span>}</td>
                    <td className={`${styles.num} ${styles.precio}`}>
                      {fila ? formatARS(fila.precioFinalArs) : <span className={styles.muted} title={`No se vende en ${sucursalNombre}`}>No disponible</span>}
                    </td>
                    <td className={styles.nota}>{p.nota || <span className={styles.muted}>—</span>}</td>
                    <td className={styles.acciones}>
                      <button type="button" className={styles.btnQuitar} onClick={() => setAQuitar(p)}>Quitar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aQuitar && (
        <ConfirmActionModal
          title="Quitar descuento"
          description={`¿Quitar el descuento de ${aQuitar.productoNombre}?${precioSinDescuento != null ? ` El precio vuelve a ${formatARS(precioSinDescuento)}.` : ''}`}
          confirmLabel="Quitar"
          isConfirming={quitando}
          onConfirm={quitar}
          onClose={() => setAQuitar(null)}
        />
      )}
    </div>
  );
}
