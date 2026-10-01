'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClienteDescuentoProducto } from '../../../../../lib/types/Region';
import { Producto } from '../../../../../lib/types/Producto';
import { productoClient } from '../../../../../lib/api/producto.client';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatARS, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import Combobox from '../../../../../components/ui/Combobox/Combobox';
import styles from './ClienteDescuentos.module.css';

interface Props {
  clienteId: string;
  productos: ClienteDescuentoProducto[];
  onChanged: () => void;
}

export default function DescuentoProductoEditor({
  clienteId,
  productos,
  onChanged,
}: Props) {
  const { showSuccess, showError } = useToast();

  const [catalogoProductos, setCatalogoProductos] = useState<Producto[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [porcentaje, setPorcentaje] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoadingCatalogo(true);
      try {
        const data = await productoClient.obtenerTodos({ operativo: true });
        if (!cancel) setCatalogoProductos(data);
      } catch (err) {
        if (!cancel) showError('Error al cargar catálogo de productos.');
      } finally {
        if (!cancel) setLoadingCatalogo(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [showError]);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductoId) {
      showError('Seleccioná un producto.');
      return;
    }

    const p = Number(porcentaje);
    if (!Number.isFinite(p) || p <= 0 || p > 100) {
      showError('Ingresá un porcentaje válido entre 0.01 y 100.');
      return;
    }

    setSaving(true);
    try {
      await clienteDescuentoClient.asignarProducto(clienteId, {
        producto_id: selectedProductoId,
        porcentaje: p,
        nota: nota.trim() || undefined,
      });
      showSuccess('Descuento de producto asignado correctamente.');
      setSelectedProductoId('');
      setPorcentaje('');
      setNota('');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al guardar descuento de producto.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setDeletingId(id);
    try {
      await clienteDescuentoClient.quitarProducto(clienteId, id);
      showSuccess('Descuento de producto eliminado.');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al eliminar descuento.');
    } finally {
      setDeletingId(null);
    }
  };

  const productoOptions = useMemo(
    () =>
      catalogoProductos.map((prod) => ({
        value: prod.id,
        label: `${prod.codigo ? `[${prod.codigo}] ` : ''}${prod.nombre}${
          prod.precioBase != null ? ` (${formatARS(prod.precioBase)})` : ''
        }`,
      })),
    [catalogoProductos]
  );

  return (
    <div>
      {/* Formulario para agregar */}
      <form onSubmit={handleAgregar} className={styles.addForm}>
        <div className={styles.addFormGrid}>
          <div className={styles.fieldProducto}>
            <Combobox
              label="Producto"
              options={productoOptions}
              value={selectedProductoId}
              onChange={setSelectedProductoId}
              placeholder={loadingCatalogo ? 'Cargando catálogo...' : 'Escribí para buscar producto por código o nombre...'}
              disabled={loadingCatalogo || saving}
              loading={loadingCatalogo}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldDescuento}`}>
            <label className={styles.fieldLabel}>Descuento (%)</label>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              className={styles.input}
              placeholder="Ej: 15"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldNota}`}>
            <label className={styles.fieldLabel}>Nota (opcional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej: Precio especial por licitación"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className={styles.fieldAction}>
            <button type="submit" className={styles.btnAction} disabled={saving || loadingCatalogo}>
              + Asignar
            </button>
          </div>
        </div>
      </form>

      {/* Lista de productos con descuento */}
      {productos.length === 0 ? (
        <div className={styles.emptyBlock}>
          No hay descuentos de producto asignados a este cliente.
        </div>
      ) : (
        <div className={styles.itemsList}>
          {productos.map((prod) => (
            <div key={prod.id} className={styles.itemCard}>
              <div className={styles.itemInfo}>
                <div>
                  <span className={styles.itemName}>{prod.productoNombre}</span>
                  <span className={styles.itemSub} style={{ display: 'block' }}>
                    Código: {prod.productoCodigo} • Precio base:{' '}
                    {formatARS(prod.productoPrecioBase)}
                  </span>
                  {prod.nota && <span className={styles.itemNote}>"{prod.nota}"</span>}
                </div>

                <span className={styles.discountBadge}>
                  -{formatPorcentaje(prod.porcentaje)}
                </span>
              </div>

              <div>
                <button
                  type="button"
                  className={styles.btnDangerOutline}
                  onClick={() => handleEliminar(prod.id)}
                  disabled={deletingId === prod.id}
                >
                  {deletingId === prod.id ? 'Quitando...' : 'Quitar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
