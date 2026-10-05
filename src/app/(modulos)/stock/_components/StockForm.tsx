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
import PrecioEditor from '../../../../components/PrecioEditor';
import { usePrecioEdicion } from '../../../../lib/hooks/usePrecioEdicion';
import { precioParaGuardar, resolverPrecioVista } from '../../../../lib/utils/precio';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';
import { PrecioResuelto } from '../../../../lib/types/Moneda';

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  precioBase: number | null;
  precio?: PrecioResuelto;
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
  const { precio, setPrecio, resetPrecio } = usePrecioEdicion(stockItem);
  const { datos: cotizacion, recargar: recargarCotizacion } = useCotizacion();
  const precioVista = resolverPrecioVista(precio.moneda, precio.importe || null, precio.cambiado ? precio.contexto : cotizacion ?? precio.contexto);

  const { sucursales } = useSucursales();
  const { getSubtipoNombre } = useClasificacion();
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!isEditing);
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [costoReposicion, setCostoReposicion] = useState('');
  const [margenMinimo, setMargenMinimo] = useState('');
  const [descuento, setDescuento] = useState('');
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
            precio: p.precio,
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
      setMargenMinimo(stockItem?.margenMinimo != null ? String(stockItem.margenMinimo) : '');
      setDescuento(stockItem?.descuento != null ? String(stockItem.descuento) : '');
    } else {
      setCostoReposicion(productoSeleccionado?.costoReposicionBase != null ? String(productoSeleccionado.costoReposicionBase) : '');
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
    productoSeleccionado?.costoReposicionBase,
    stockItem?.descuento,
  ]);

  const numeroDeCampo = (valor: string): number | null => (valor.trim() === '' ? null : Number(valor));
  const costo = numeroDeCampo(costoReposicion);
  const precioVenta = precioVista.ars === null ? null : Number(precioVista.ars);
  const margen = numeroDeCampo(margenMinimo);
  const hayValorInvalido = [costo, precioVenta, margen].some((valor) => valor !== null && (!Number.isFinite(valor) || valor < 0));
  const precioMinimo = costo !== null && margen !== null && costo > 0 ? costo * (1 + margen / 100) : null;
  const margenInvalido = hayValorInvalido || (
    precioMinimo !== null &&
    precioVenta !== null &&
    precioVenta < precioMinimo
  );

  // Nivel 3 de la lista de precios: el margen mínimo marca cuánto se puede
  // descontar como máximo sobre este producto.
  const descuentoMaximo =
    precioMinimo !== null && precioVenta !== null && precioVenta > 0 && precioMinimo < precioVenta
      ? Math.round((1 - precioMinimo / precioVenta) * 10000) / 100
      : precioMinimo !== null && precioVenta !== null
      ? 0
      : null;
  const descuentoNum = numeroDeCampo(descuento);
  const descuentoExcedido =
    descuentoMaximo !== null && descuentoNum !== null && descuentoNum > descuentoMaximo;
  // Sin valor propio, el nivel 3 toma el descuento general del producto.
  const heredaDescuento = descuento.trim() === '' && stockItem?.descuentoBase != null;

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
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          descuento: parseNum('descuento'),
          stock_minimo: parseNum('stockMinimo'),
          ...(readOnly ? {} : {
            ...(parseNum('cantidadDisponible') !== Number(stockItem?.cantidadDisponible) ? { cantidad_disponible: parseNum('cantidadDisponible') } : {}),
            ...(parseNum('cantidadReservada') !== Number(stockItem?.cantidadReservada) ? { cantidad_reservada: parseNum('cantidadReservada') } : {}),
          }),
          habilitado: formData.get('habilitado') === 'true',
        }
      : {
          producto_id: formData.get('productoId'),
          sucursal_id: formData.get('sucursalId'),
          costo_reposicion: parseNum('costoReposicion'),
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          descuento: parseNum('descuento'),
          stock_minimo: parseNum('stockMinimo'),
          habilitado: formData.get('habilitado') === 'true',
        };

    try {
      savingRef.current = true;
      setIsSaving(true);
      const precioInput = precioParaGuardar(precio, cotizacion);
      const payload = { ...body, ...(precioInput !== undefined ? { precio: precioInput } : {}) };
      if (isEditing) {
        await stockClient.actualizar(stockItem!.id, payload);
        if (readOnly) {
          await reload();
          setInlineEditing(false);
        } else {
          router.push(`/stock/${stockItem!.id}`);
        }
        showSuccess('Configuración de stock actualizada correctamente.');
      } else {
        await stockClient.crear(payload);
        router.push('/stock');
        showSuccess('Configuración de stock creada correctamente.');
      }
    } catch (err) {
      if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO') await recargarCotizacion();
      if (!(err instanceof CatalogoApiError)) console.error('Error al guardar stock:', err);
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
    resetPrecio();
    setMargenMinimo(stockItem.margenMinimo != null ? String(stockItem.margenMinimo) : '');
    setDescuento(stockItem.descuento != null ? String(stockItem.descuento) : '');
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

  const money = (value?: number | null) => formatARS(value);

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
                <DetailField label="Descuento">
                  {stockItem.descuento != null
                    ? `${stockItem.descuento}%`
                    : stockItem.descuentoBase != null
                    ? `${stockItem.descuentoBase}% (del producto)`
                    : '—'}
                </DetailField>
                <div style={{ gridColumn: '1 / -1' }}><PrecioEditor value={precio} onChange={setPrecio} original={stockItem.precio} heredado={stockItem.precioHeredado} readOnly label="Precio de sucursal" /></div>
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
                    onChange={id => { setProductoSeleccionadoId(id); setPrecio({ moneda: 'ARS', importe: '', contexto: cotizacion, cambiado: false }); }}
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
            <PrecioEditor value={precio} onChange={setPrecio} original={stockItem?.precio} heredado={stockItem?.precioHeredado} label="Precio de sucursal" />
            {!isEditing && productoSeleccionado && <div style={{ margin: '12px 0' }}>
              <p>Sugerencia global: referencia {productoSeleccionado.precio?.moneda_referencia ?? 'ARS'}, ARS {formatARS(productoSeleccionado.precio?.ars ?? productoSeleccionado.precioBase)} · USD {formatUSD(productoSeleccionado.precio?.usd)}.</p>
              <Button type="button" variant="secondary" disabled={productoSeleccionado.precio?.importe_referencia == null && productoSeleccionado.precioBase == null} onClick={() => setPrecio({ moneda: productoSeleccionado.precio?.moneda_referencia ?? 'ARS', importe: productoSeleccionado.precio?.importe_referencia ?? String(productoSeleccionado.precioBase), contexto: cotizacion, cambiado: true })}>Copiar sugerencia global</Button>
              <p>El precio de esta sucursal será independiente.</p>
            </div>}
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
              <Input
                label="Descuento (%)"
                name="descuento"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={descuento}
                onChange={(event) => setDescuento(event.target.value)}
                placeholder={heredaDescuento ? String(stockItem!.descuentoBase) : '—'}
              />
            </div>
            {heredaDescuento && (
              <p className={styles.hintDescuento}>
                Vacío: hereda el descuento general del producto ({stockItem!.descuentoBase}%).
              </p>
            )}
            {descuentoMaximo !== null && (
              <p className={styles.hintDescuento}>
                Descuento máximo sin perforar el margen mínimo: <b>{descuentoMaximo}%</b>.
                {descuentoExcedido && ' El valor cargado lo supera y se topeará al generar la lista de precios.'}
              </p>
            )}
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
