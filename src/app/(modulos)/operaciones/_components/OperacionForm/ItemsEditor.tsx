'use client';

import { useEffect, useState } from 'react';
import Button from '../../../../../components/ui/Button/Button';
import Combobox from '../../../../../components/ui/Combobox/Combobox';
import Input from '../../../../../components/ui/Input/Input';
import { stockClient } from '../../../../../lib/api/stock.client';
import { StockItem } from '../../../../../lib/types/Stock';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import styles from './ItemsEditor.module.css';

interface ItemsEditorProps {
  sucursalId: string;
  items: OperacionItemInput[];
  onChange: (items: OperacionItemInput[]) => void;
  modo: 'compra' | 'venta' | 'traslado';
  /** Informa al formulario si algún ítem viola el margen mínimo (solo ventas). */
  onMargenInvalidoChange?: (hayViolacion: boolean) => void;
}

/**
 * Precio mínimo de venta según el margen mínimo de utilidad configurado:
 *   costo_reposicion * (1 + margen_minimo / 100)
 * Devuelve null si no hay datos suficientes para calcularlo (no se valida).
 * Debe coincidir con la validación del backend en operacion.repository.ts.
 */
export function calcularPrecioMinimo(stockItem?: StockItem): number | null {
  if (!stockItem) return null;
  const { costoReposicion, margenMinimo } = stockItem;
  if (!costoReposicion || costoReposicion <= 0 || !margenMinimo) return null;
  return costoReposicion * (1 + margenMinimo / 100);
}

/** True si el ítem viola el margen mínimo (solo aplica a ventas). */
export function violaMargenMinimo(item: OperacionItemInput, stockItem?: StockItem): boolean {
  const minimo = calcularPrecioMinimo(stockItem);
  if (minimo === null) return false;
  const precio = item.precioUnitArs ?? stockItem?.precioVentaArs;
  if (precio === undefined || precio === null) return false;
  return precio < minimo - 0.01;
}

export default function ItemsEditor({ sucursalId, items, onChange, modo, onMargenInvalidoChange }: ItemsEditorProps) {
  const [productos, setProductos] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sucursalId) {
      setProductos([]);
      return;
    }
    setLoading(true);
    stockClient
      .obtenerPaginado({ limit: 200, offset: 0, sucursalId })
      .then((res) => setProductos(res.data))
      .catch((err) => console.error('[ItemsEditor] Error cargando productos:', err))
      .finally(() => setLoading(false));
  }, [sucursalId]);

  useEffect(() => {
    if (!onMargenInvalidoChange) return;
    const hayViolacion =
      modo === 'venta' &&
      items.some((item) => violaMargenMinimo(item, productos.find((p) => p.id === item.productoSucursalId)));
    onMargenInvalidoChange(hayViolacion);
  }, [items, productos, modo, onMargenInvalidoChange]);

  const agregarItem = () => {
    onChange([...items, { productoSucursalId: '', cantidad: 1 }]);
  };

  const quitarItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index: number, patch: Partial<OperacionItemInput>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Productos</h3>
        <Button type="button" variant="secondary" onClick={agregarItem} disabled={!sucursalId}>
          + Agregar producto
        </Button>
      </div>

      {!sucursalId && <p className={styles.hint}>Seleccioná una sucursal primero.</p>}

      {items.length === 0 && sucursalId && <p className={styles.hint}>Todavía no agregaste productos.</p>}

      {items.map((item, index) => {
        const stockItem = productos.find((p) => p.id === item.productoSucursalId);
        const productoOptions = productos.map((p) => ({
          value: p.id,
          label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nombre} (disp: ${p.cantidadDisponible})`,
        }));
        return (
          <div key={index} className={styles.row}>
            <Combobox
              label="Producto"
              options={productoOptions}
              value={item.productoSucursalId}
              onChange={(value) => actualizarItem(index, { productoSucursalId: value })}
              placeholder="Buscar producto..."
              loading={loading}
            />
            <Input
              label="Cantidad"
              type="number"
              min={1}
              step="1"
              value={item.cantidad}
              onChange={(e) => actualizarItem(index, { cantidad: Number(e.target.value) })}
            />
            {modo === 'compra' && (
              <Input
                label="Costo unit. ($)"
                type="number"
                step="0.01"
                value={item.costoUnitArs ?? ''}
                onChange={(e) => actualizarItem(index, { costoUnitArs: e.target.value ? Number(e.target.value) : undefined })}
              />
            )}
            {modo === 'venta' && (
              <div className={styles.precioField}>
                <Input
                  label="Precio unit. ($)"
                  type="number"
                  step="0.01"
                  value={item.precioUnitArs ?? stockItem?.precioVentaArs ?? ''}
                  onChange={(e) => actualizarItem(index, { precioUnitArs: e.target.value ? Number(e.target.value) : undefined })}
                />
                {violaMargenMinimo(item, stockItem) && (
                  <span className={styles.errorHint}>
                    Mínimo ${calcularPrecioMinimo(stockItem)!.toFixed(2)} (margen {stockItem!.margenMinimo}%)
                  </span>
                )}
              </div>
            )}
            <Button type="button" variant="danger" onClick={() => quitarItem(index)}>
              Quitar
            </Button>
          </div>
        );
      })}
    </div>
  );
}
