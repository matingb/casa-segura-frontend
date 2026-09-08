'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import Combobox from '../../../../components/ui/Combobox/Combobox';
import Badge from '../../../../components/ui/Badge/Badge';
import DetailField from '../../../../components/ui/DetailField/DetailField';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { StockItem } from '../../../../lib/types/Stock';
import { productoClient } from '../../../../lib/api/producto.client';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useStockDetalle } from '../_hooks/useStockDetalle';
import { useToast } from '../../../../context/ToastContext';
import { formatARS, formatUSD } from '../../../../lib/utils/formatters';
import styles from './StockForm.module.css';

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  precioBase: number | null;
  costoReposicionBase?: number | null;
}

interface StockFormProps {
  title: string;
  stockItem?: StockItem;
  stockItemId?: string;
  readOnly?: boolean;
}

export default function StockForm({ title, stockItem: stockItemProp, stockItemId, readOnly = false }: StockFormProps) {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { stockItem: stockItemCargado, isLoading: isLoadingDetalle, error: errorDetalle, reload } = useStockDetalle(stockItemId ?? '');
  const stockItem = stockItemId ? stockItemCargado ?? undefined : stockItemProp;
  const isEditing = Boolean(stockItemId) || Boolean(stockItemProp?.id);

  const { sucursales } = useSucursales();
  const { getSubtipoNombre } = useClasificacion();
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!isEditing);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [costoReposicion, setCostoReposicion] = useState('');
  const [precioVentaArs, setPrecioVentaArs] = useState('');
  const [margenMinimo, setMargenMinimo] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const savingRef = useRef(false);
  const isReadOnlyView = readOnly && !inlineEditing;

  useEffect(() => {
    if (isEditing) return;

    const fetchOptions = async () => {
      try {
        const data = await productoClient.obtenerTodos({ operativo: true });
        setProductos(
          data.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            precioBase: p.precioBase,
            costoReposicionBase: p.costoReposicionBase,
          }))
        );
      } catch (err) {
        console.error('[StockForm] Error cargando opciones:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [isEditing]);

  const productoSeleccionado = productos.find((p) => p.id === productoSeleccionadoId);

  useEffect(() => {
    if (isEditing) {
      setCostoReposicion(stockItem?.costoReposicion != null ? String(stockItem.costoReposicion) : '');
      setPrecioVentaArs(stockItem?.precioVentaArs != null ? String(stockItem.precioVentaArs) : '');
      setMargenMinimo(stockItem?.margenMinimo != null ? String(stockItem.margenMinimo) : '');
    } else {
      setCostoReposicion(productoSeleccionado?.costoReposicionBase != null ? String(productoSeleccionado.costoReposicionBase) : '');
      setPrecioVentaArs(productoSeleccionado?.precioBase != null ? String(productoSeleccionado.precioBase) : '');
      setMargenMinimo('');
    }
    setSubmitError(null);
  }, [
    isEditing,
    stockItem?.id,
    stockItem?.costoReposicion,
    stockItem?.precioVentaArs,
    stockItem?.margenMinimo,
    productoSeleccionado?.id,
  ]);

  const numeroDeCampo = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));
  const costo = numeroDeCampo(costoReposicion);
  const precioVenta = numeroDeCampo(precioVentaArs);
  const margen = numeroDeCampo(margenMinimo);
  const hayValorInvalido = [costo, precioVenta, margen].some((valor) => valor !== null && (!Number.isFinite(valor) || valor < 0));
  const precioMinimo = costo !== null && margen !== null && costo > 0 ? costo * (1 + margen / 100) : null;
  const margenInvalido = hayValorInvalido || (
    precioMinimo !== null &&
    precioVenta !== null &&
    precioVenta < precioMinimo
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (margenInvalido) {
      setSubmitError('El precio de venta ARS debe respetar el margen minimo configurado.');
      return;
    }
    setSubmitError(null);
    const formData = new FormData(e.currentTarget);

    const parseNum = (key: string) => {
      const val = formData.get(key);
      return val !== '' && val !== null ? Number(val) : null;
    };

    const body = isEditing
      ? {
          costo_reposicion: parseNum('costoReposicion'),
          precio_venta_ars: parseNum('precioVentaArs'),
          precio_venta_usd: parseNum('precioVentaUsd'),
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          stock_minimo: parseNum('stockMinimo'),
          ...(readOnly ? {} : {
            cantidad_disponible: parseNum('cantidadDisponible'),
            cantidad_reservada: parseNum('cantidadReservada'),
          }),
          habilitado: formData.get('habilitado') === 'true',
        }
      : {
          producto_id: formData.get('productoId'),
          sucursal_id: formData.get('sucursalId'),
          costo_reposicion: parseNum('costoReposicion'),
          precio_venta_ars: parseNum('precioVentaArs'),
          precio_venta_usd: parseNum('precioVentaUsd'),
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          stock_minimo: parseNum('stockMinimo'),
          habilitado: formData.get('habilitado') === 'true',
        };

    try {
      savingRef.current = true;
      setIsSaving(true);
      if (isEditing) {
        await stockClient.actualizar(stockItem!.id, body);
        if (readOnly) {
          await reload();
          setInlineEditing(false);
        } else {
          router.push(`/stock/${stockItem!.id}`);
        }
        showSuccess('Configuración de stock actualizada correctamente.');
      } else {
        await stockClient.crear(body);
        router.push('/stock');
        showSuccess('Configuración de stock creada correctamente.');
      }
    } catch (err) {
      console.error('Error al guardar stock:', err);
      const message = err instanceof Error ? err.message : 'No se pudo guardar la configuración de stock. Intenta nuevamente.';
      setSubmitError(message);
      showError(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    if (!stockItem) return;
    setCostoReposicion(stockItem.costoReposicion != null ? String(stockItem.costoReposicion) : '');
    setPrecioVentaArs(stockItem.precioVentaArs != null ? String(stockItem.precioVentaArs) : '');
    setMargenMinimo(stockItem.margenMinimo != null ? String(stockItem.margenMinimo) : '');
    setSubmitError(null);
    setInlineEditing(false);
  };

  const handleDelete = async () => {
    if (!stockItem || isDeleting) return;
    try {
      setIsDeleting(true);
      await stockClient.eliminar(stockItem.id);
      showSuccess('Configuración de stock eliminada correctamente.');
      router.push('/stock');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo eliminar la configuración de stock.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (stockItemId && isLoadingDetalle) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p className={styles.loadingText}>Cargando stock...</p>
        </Card>
      </div>
    );
  }

  if (stockItemId && (errorDetalle || !stockItem)) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>{errorDetalle ?? 'Stock no encontrado'}</p>
          <Button variant="secondary" onClick={() => router.push('/stock')}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  const money = (value?: number) => (value ? formatARS(value) : '—');
  const usd = (value?: number) => (value ? formatUSD(value) : '—');

  if (isReadOnlyView && stockItem) {
    return (
      <div className={`${styles.page} ${styles.pageDetail}`}>
        <button type="button" className={styles.backLink} onClick={() => router.push('/stock')}>
          ← Volver a stock
        </button>

        <div className={styles.pageTitleRow}>
          <h1 className={styles.pageTitle}>{title}</h1>
          <span className={styles.readOnlyChip}>Solo lectura</span>
        </div>

        <Card>
          <div className={styles.fieldset}>
            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Producto y sucursal</h2>
              <div className={styles.detailGrid}>
                <div style={{ gridColumn: 'span 2' }}>
                  <DetailField label="Producto">
                    {stockItem.nombre}
                    {stockItem.codigo ? ` (${stockItem.codigo})` : ''}
                  </DetailField>
                </div>
                <DetailField label="Sucursal">{stockItem.sucursalNombre}</DetailField>
                <DetailField label="Marca">{stockItem.marca || '—'}</DetailField>
                <DetailField label="Modelo">{stockItem.modelo || '—'}</DetailField>
                <DetailField label="Subtipo">{getSubtipoNombre(stockItem.subtipoId)}</DetailField>
              </div>
            </div>

            {stockItem.imagenUrl && (
              <div className={`${styles.section} ${styles.sectionDetail}`}>
                <h2 className={styles.sectionTitle}>Imagen</h2>
                <div className={styles.imageCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stockItem.imagenUrl} alt={stockItem.nombre} className={styles.detailImage} />
                </div>
              </div>
            )}

            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Precios y costos</h2>
              <div className={styles.detailGrid}>
                <DetailField label="Precio base (referencia)">
                  {money(stockItem.precioBase ?? undefined)}
                </DetailField>
                <DetailField label="Costo de reposición">
                  {money(stockItem.costoReposicion)}
                </DetailField>
                <DetailField label="Margen mínimo">
                  {stockItem.margenMinimo ? `${stockItem.margenMinimo}%` : '—'}
                </DetailField>
                <DetailField label="Precio venta ARS">
                  {money(stockItem.precioVentaArs)}
                </DetailField>
                <DetailField label="Precio venta USD">
                  {usd(stockItem.precioVentaUsd)}
                </DetailField>
                <DetailField label="IVA">
                  {stockItem.iva ? `${stockItem.iva}%` : '—'}
                </DetailField>
              </div>
            </div>

            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Control de stock</h2>
              <div className={styles.detailGrid}>
                <DetailField label="Cantidad disponible">{stockItem.cantidadDisponible ?? 0}</DetailField>
                <DetailField label="Cantidad reservada">{stockItem.cantidadReservada ?? 0}</DetailField>
                <DetailField label="Stock mínimo">{stockItem.stockMinimo ?? 0}</DetailField>
                <DetailField label="Estado">
                  <Badge variant={stockItem.activo ? 'success' : 'neutral'}>
                    {stockItem.activo ? 'Habilitado' : 'Deshabilitado'}
                  </Badge>
                </DetailField>
              </div>
            </div>
          </div>

          <div className={styles.actionsDetail}>
            <Button type="button" variant="secondary" onClick={() => router.push('/stock')}>
              Volver
            </Button>
            <Button type="button" onClick={() => setInlineEditing(true)}>
              Editar
            </Button>
            <Button type="button" variant="danger" onClick={() => setShowDeleteConfirmation(true)}>
              Eliminar
            </Button>
          </div>
        </Card>
        {showDeleteConfirmation && (
          <ConfirmActionModal
            title="Eliminar configuración de stock"
            description="Se dará de baja esta configuración de stock. Solo es posible si no tiene cantidades disponibles ni reservadas."
            confirmLabel="Eliminar configuración"
            isConfirming={isDeleting}
            onConfirm={handleDelete}
            onClose={() => setShowDeleteConfirmation(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form} key={stockItem?.id ?? 'nuevo'}>
          {/* ── Selección de producto/sucursal ─────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Producto y sucursal</h2>

            {isEditing ? (
              <div className={styles.grid}>
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Producto</span>
                  <span className={styles.readonlyValue}>
                    {stockItem!.nombre}
                    {stockItem!.codigo ? ` (${stockItem!.codigo})` : ''}
                  </span>
                </div>
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Sucursal</span>
                  <span className={styles.readonlyValue}>{stockItem!.sucursalNombre}</span>
                </div>
              </div>
            ) : loadingOptions ? (
              <p className={styles.loadingText}>Cargando opciones...</p>
            ) : (
              <div className={styles.grid}>
                <div>
                  <input type="hidden" name="productoId" value={productoSeleccionadoId} />
                  <Combobox
                    label="Producto"
                    options={productos.map((p) => ({
                      value: p.id,
                      label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nombre}`,
                    }))}
                    value={productoSeleccionadoId}
                    onChange={setProductoSeleccionadoId}
                    placeholder="Buscar producto..."
                    disabled={loadingOptions}
                    loading={loadingOptions}
                  />
                </div>
                <Select label="Sucursal" name="sucursalId" required>
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* ── Precios y costos ───────────────────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Precios y costos</h2>
            <div className={styles.grid}>
              {/*
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Precio base (referencia)</span>
                  <span className={styles.readonlyValue}>
                    {precioBaseReferencia ? formatARS(precioBaseReferencia) : '—'}
                  </span>
                </div>
              */}
              <Input
                label="Costo de reposición ($)"
                name="costoReposicion"
                type="number"
                min="0"
                step="0.01"
                value={costoReposicion}
                onChange={(event) => {
                  setCostoReposicion(event.target.value);
                  setSubmitError(null);
                }}
                aria-invalid={margenInvalido || undefined}
                className={margenInvalido ? styles.invalidInput : undefined}
                placeholder="Ej: 15000"
              />
              <Input
                label="Precio venta ARS ($)"
                name="precioVentaArs"
                type="number"
                min="0"
                step="0.01"
                value={precioVentaArs}
                onChange={(event) => {
                  setPrecioVentaArs(event.target.value);
                  setSubmitError(null);
                }}
                aria-invalid={margenInvalido || undefined}
                className={margenInvalido ? styles.invalidInput : undefined}
                placeholder="Ej: 25000"
              />
              <Input
                label="Precio venta USD (u$s)"
                name="precioVentaUsd"
                type="number"
                step="0.01"
                defaultValue={stockItem?.precioVentaUsd}
                placeholder="Ej: 25"
              />
              <Input
                label="IVA (%)"
                name="iva"
                type="number"
                step="0.01"
                defaultValue={stockItem?.iva ?? 21}
                placeholder="Ej: 21"
              />
              <Input
                label="Margen mínimo (%)"
                name="margenMinimo"
                type="number"
                min="0"
                step="0.01"
                value={margenMinimo}
                onChange={(event) => {
                  setMargenMinimo(event.target.value);
                  setSubmitError(null);
                }}
                aria-invalid={margenInvalido || undefined}
                className={margenInvalido ? styles.invalidInput : undefined}
                placeholder="Ej: 30"
              />
            </div>
            {margenInvalido && (
              <p className={styles.validationError} role="alert">
                {precioMinimo !== null
                  ? `El precio de venta ARS debe ser de al menos $${precioMinimo.toFixed(2)} para respetar el margen minimo de ${margen ?? 0}%.`
                  : 'Revisa los valores de costo, precio de venta y margen minimo.'}
              </p>
            )}
            {submitError && <p className={styles.validationError} role="alert">{submitError}</p>}
          </div>

          {/* ── Control de stock ───────────────────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Control de stock</h2>
            <div className={styles.grid}>
              {isEditing && !readOnly && (
                <>
                  <Input
                    label="Cantidad disponible"
                    name="cantidadDisponible"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={stockItem?.cantidadDisponible ?? 0}
                    placeholder="Ej: 20"
                  />
                  <Input
                    label="Cantidad reservada"
                    name="cantidadReservada"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={stockItem?.cantidadReservada ?? 0}
                    placeholder="Ej: 0"
                  />
                </>
              )}
              <Input
                label="Stock mínimo"
                name="stockMinimo"
                type="number"
                step="1"
                defaultValue={stockItem?.stockMinimo ?? 0}
                placeholder="Ej: 5"
              />
              <Select
                label="Estado"
                name="habilitado"
                defaultValue={stockItem ? String(stockItem.activo) : 'true'}
              >
                <option value="true">Habilitado</option>
                <option value="false">Deshabilitado</option>
              </Select>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={readOnly ? cancelInlineEdit : () => router.push('/stock')} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving || margenInvalido}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
