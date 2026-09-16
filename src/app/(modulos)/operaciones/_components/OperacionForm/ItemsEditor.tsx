'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Combobox from '../../../../../components/ui/Combobox/Combobox';
import Input from '../../../../../components/ui/Input/Input';
import { stockClient } from '../../../../../lib/api/stock.client';
import { StockItem } from '../../../../../lib/types/Stock';
import { OperacionItemInput } from '../../../../../lib/types/OperacionCrear';
import { formatARS } from '../../../../../lib/utils/formatters';
import styles from './ItemsEditor.module.css';

interface ItemsEditorProps {
  sucursalId: string;
  items: OperacionItemInput[];
  onChange: (items: OperacionItemInput[]) => void;
  modo: 'compra' | 'venta' | 'traslado';
  /** Informa al formulario si algún ítem viola el margen mínimo (solo ventas). */
  onMargenInvalidoChange?: (hayViolacion: boolean) => void;
  /** Errores por campo, solo después de que el usuario intentó registrar. */
  errores?: Record<string, string>;
  /** Se limpia el error del campo apenas se lo edita. */
  onCampoEditado?: (campo: string) => void;
  /** Impacto en stock, que se muestra al pie: positivo entra, negativo sale. */
  unidades?: number;
  sucursalNombre?: string;
}

/** Importe de la fila: cantidad × precio unitario, sin redondear. */
export function importeItem(item: OperacionItemInput, modo: 'compra' | 'venta' | 'traslado'): number {
  const unitario = modo === 'compra' ? item.costoUnitArs : item.precioUnitArs;
  return (item.cantidad || 0) * (unitario ?? 0);
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

/**
 * Unidades que exceden el stock disponible, o 0 si alcanza.
 *
 * Es solo un aviso: la validación que manda es la del backend
 * (`ajustarStockVenta` en operacion.repository.ts), que además bloquea la fila
 * con FOR UPDATE. Entre que se carga el formulario y se registra, otro usuario
 * puede haber vendido las mismas unidades.
 */
export function excedeStock(item: OperacionItemInput, stockItem?: StockItem): number {
  if (!stockItem) return 0;
  const disponible = stockItem.cantidadDisponible ?? 0;
  const pedida = item.cantidad || 0;
  return pedida > disponible ? pedida - disponible : 0;
}

export default function ItemsEditor({
  sucursalId,
  items,
  onChange,
  modo,
  onMargenInvalidoChange,
  errores = {},
  onCampoEditado,
  unidades,
  sucursalNombre,
}: ItemsEditorProps) {
  const [productos, setProductos] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sucursalId) {
      setProductos([]);
      return;
    }
    setLoading(true);
    stockClient
      .obtenerPaginado({ limit: 200, offset: 0, sucursalId, operativo: true })
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
    onChange([...items, { productoSucursalId: '', cantidad: 1, cantidadImpactadaStock: 1 }]);
  };

  const quitarItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const actualizarItem = (index: number, patch: Partial<OperacionItemInput>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const seleccionarProducto = (index: number, productoSucursalId: string) => {
    const productoSeleccionado = productos.find((producto) => producto.id === productoSucursalId);
    const precioPorDefecto = modo === 'venta'
      ? { precioUnitArs: productoSeleccionado?.precioVentaArs }
      : modo === 'compra'
        ? { costoUnitArs: productoSeleccionado?.costoReposicion }
        : {};

    actualizarItem(index, { productoSucursalId, ...precioPorDefecto });
  };

  /** Productos cargados por encima de su stock disponible. */
  const excedidos = items
    .map((item) => {
      const stockItem = productos.find((p) => p.id === item.productoSucursalId);
      return {
        nombre: stockItem?.nombre ?? '',
        exceso: excedeStock(item, stockItem),
      };
    })
    .filter((e) => e.exceso > 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Productos</h3>
      </div>

      {!sucursalId && <p className={styles.hint}>Seleccioná una sucursal primero.</p>}

      {items.length === 0 && sucursalId && modo === 'traslado' && (
        <p className={styles.hint}>Todavía no agregaste productos.</p>
      )}

      {modo !== 'traslado' && (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th scope="col" className={styles.colProducto}>Producto</th>
              <th scope="col" className={styles.colNumero}>Cantidad</th>
              <th scope="col" className={styles.colNumero}>Impactar ahora</th>
              <th scope="col" className={styles.colNumero}>
                {modo === 'compra' ? 'Costo unit.' : 'Precio unit.'}
              </th>
              <th scope="col" className={styles.colNumero}>Importe</th>
              <th scope="col" className={styles.colAccion} aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const stockItem = productos.find((p) => p.id === item.productoSucursalId);
              const productoOptions = productos.map((p) => ({
                value: p.id,
                label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nombre} (disp: ${p.cantidadDisponible})`,
              }));
              const unitario = modo === 'compra' ? item.costoUnitArs : item.precioUnitArs;
              const errorCantidad = errores[`items.${index}.cantidad`];
              const errorImpactoStock = errores[`items.${index}.impactoStock`];
              const errorUnitario = errores[`items.${index}.unitario`];

              return (
                <tr key={index}>
                  <td className={styles.colProducto}>
                    <Combobox
                      options={productoOptions}
                      value={item.productoSucursalId}
                      onChange={(value) => {
                        onCampoEditado?.(`items.${index}.producto`);
                        seleccionarProducto(index, value);
                      }}
                      placeholder="Buscar producto..."
                      loading={loading}
                    />
                    {errores[`items.${index}.producto`] && (
                      <span className={styles.errorCampo}>{errores[`items.${index}.producto`]}</span>
                    )}
                  </td>

                  <td className={styles.colNumero}>
                    <input
                      className={errorCantidad ? styles.inputCantidadError : styles.inputCantidad}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      aria-label={`Cantidad de la fila ${index + 1}`}
                      value={item.cantidad ?? ''}
                      onChange={(e) => {
                        onCampoEditado?.(`items.${index}.cantidad`);
                        const v = e.target.value;
                        const cantidad = v === '' ? 0 : Number(v);
                        actualizarItem(index, { cantidad, cantidadImpactadaStock: cantidad });
                      }}
                    />
                    {errorCantidad && <span className={styles.errorCampo}>{errorCantidad}</span>}
                  </td>

                  <td className={styles.colNumero}>
                    <input
                      className={errorImpactoStock ? styles.inputCantidadError : styles.inputCantidad}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={item.cantidad ?? 0}
                      step="1"
                      aria-label={`Cantidad a impactar del stock de la fila ${index + 1}`}
                      value={item.cantidadImpactadaStock ?? item.cantidad ?? ''}
                      onChange={(e) => {
                        onCampoEditado?.(`items.${index}.impactoStock`);
                        const v = e.target.value;
                        actualizarItem(index, { cantidadImpactadaStock: v === '' ? 0 : Number(v) });
                      }}
                    />
                    {errorImpactoStock && <span className={styles.errorCampo}>{errorImpactoStock}</span>}
                  </td>

                  <td className={styles.colNumero}>
                    <input
                      className={errorUnitario ? styles.inputError : styles.inputNumero}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      aria-label={`${modo === 'compra' ? 'Costo' : 'Precio'} unitario de la fila ${index + 1}`}
                      value={unitario ?? ''}
                      onChange={(e) => {
                        onCampoEditado?.(`items.${index}.unitario`);
                        const v = e.target.value;
                        const parsed = v === '' ? undefined : Number(v);
                        actualizarItem(
                          index,
                          modo === 'compra' ? { costoUnitArs: parsed } : { precioUnitArs: parsed }
                        );
                      }}
                    />
                    {errorUnitario && <span className={styles.errorCampo}>{errorUnitario}</span>}
                    {modo === 'venta' && violaMargenMinimo(item, stockItem) && (
                      <span className={styles.errorCampo}>
                        Mínimo {formatARS(calcularPrecioMinimo(stockItem)!)} (margen {stockItem!.margenMinimo}%)
                      </span>
                    )}
                  </td>

                  <td className={`${styles.colNumero} ${styles.celdaImporte}`}>
                    {formatARS(importeItem(item, modo))}
                  </td>

                  <td className={styles.colAccion}>
                    <span className={styles.celdaAccion}>
                      <IconButton
                        icon={<Trash2 size={15} />}
                        label={`Quitar la fila ${index + 1}`}
                        onClick={() => quitarItem(index)}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}

            <tr className={styles.filaAgregar}>
              <td colSpan={6}>
                <button
                  type="button"
                  className={styles.botonAgregar}
                  onClick={agregarItem}
                  disabled={!sucursalId}
                >
                  <Plus size={13} aria-hidden="true" />
                  Agregar producto
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {modo === 'traslado' &&
        items.map((item, index) => {
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
                onChange={(value) => seleccionarProducto(index, value)}
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
              <Button type="button" variant="danger" onClick={() => quitarItem(index)}>
                Quitar
              </Button>
            </div>
          );
        })}

      {modo === 'traslado' && (
        <Button type="button" variant="secondary" onClick={agregarItem} disabled={!sucursalId}>
          + Agregar producto
        </Button>
      )}

      {unidades !== undefined && modo !== 'traslado' && (
        <p className={styles.pieStock}>
          Stock:{' '}
          <span className={styles.pieStockValor}>
            {unidades >= 0 ? '+' : '−'}
            {Math.abs(unidades)} {Math.abs(unidades) === 1 ? 'unidad' : 'unidades'}
          </span>
          {sucursalNombre ? ` en ${sucursalNombre}` : ''}
        </p>
      )}

      {modo === 'venta' && excedidos.length > 0 && (
        <div className={styles.avisoStock}>
          <AlertTriangle size={16} className={styles.avisoStockIcono} aria-hidden="true" />
          <span>
            {excedidos.length === 1 ? (
              <>
                <strong>{excedidos[0].nombre}</strong> supera el stock disponible en{' '}
                <strong>{excedidos[0].exceso}</strong>{' '}
                {excedidos[0].exceso === 1 ? 'unidad' : 'unidades'}.
              </>
            ) : (
              <>
                <strong>{excedidos.length} productos</strong> superan el stock disponible:{' '}
                {excedidos.map((e) => `${e.nombre} (+${e.exceso})`).join(', ')}.
              </>
            )}{' '}
            La venta se registra igual y el stock queda en negativo.
          </span>
        </div>
      )}
    </div>
  );
}
