'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import Combobox from '../../../../components/ui/Combobox/Combobox';
import ImageUploader from '../../../../components/ui/ImageUploader/ImageUploader';
import Badge from '../../../../components/ui/Badge/Badge';
import DetailField from '../../../../components/ui/DetailField/DetailField';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { Producto, UnidadDimension, UnidadPeso } from '../../../../lib/types/Producto';
import { productoClient } from '../../../../lib/api/producto.client';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useProductoDetalle } from '../_hooks/useProductoDetalle';
import { useToast } from '../../../../context/ToastContext';
import { formatMedida, parseNum } from '../../../../lib/utils/formatters';
import styles from './ProductoForm.module.css';
import PrecioEditor from '../../../../components/PrecioEditor';
import PrecioDetalle from '../../../../components/PrecioDetalle';
import { useMontoEdicion, usePrecioEdicion } from '../../../../lib/hooks/usePrecioEdicion';
import { costoParaGuardar, PrecioEdicion, precioParaGuardar, resolverPrecioVista } from '../../../../lib/utils/precio';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';

interface ProductoFormProps {
  title: string;
  producto?: Producto;
  productoId?: string;
  readOnly?: boolean;
  /** Al crear: producto cuyos datos se copian de entrada (ej. desde el listado). */
  copiarDeId?: string;
}

/** Precio o costo de un producto como borrador del editor (para copiarlo). */
function montoCopiado(resuelto: Producto['precio'], arsLegado: number | null | undefined, contexto: PrecioEdicion['contexto']): PrecioEdicion {
  const importe = resuelto ? resuelto.importe_referencia ?? '' : arsLegado?.toString() ?? '';
  return { moneda: resuelto?.moneda_referencia ?? 'ARS', importe, contexto, cambiado: importe !== '' };
}

const MENSAJE_COPIA_SIN_CAMBIOS = 'Cambiá al menos un dato respecto del producto copiado.';

function focusNextField(current: HTMLElement, form: HTMLFormElement | null) {
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]')
  ).filter((el) => el.tabIndex !== -1);
  const currentIndex = focusable.indexOf(current);
  const next = focusable[currentIndex + 1];
  next?.focus();
}

function handleEnterAdvance(e: KeyboardEvent<HTMLInputElement>, formRef: React.RefObject<HTMLFormElement | null>) {
  if (e.key === 'Enter') {
    e.preventDefault();
    focusNextField(e.currentTarget, formRef.current);
  }
}

export default function ProductoForm({ title, producto: productoProp, productoId, readOnly = false, copiarDeId }: ProductoFormProps) {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { producto: productoCargado, isLoading, error, reload } = useProductoDetalle(productoId ?? '');
  const producto = productoId ? productoCargado ?? undefined : productoProp;
  const { precio, setPrecio, resetPrecio } = usePrecioEdicion(producto);
  const { monto: costo, setMonto: setCosto, resetMonto: resetCosto } = useMontoEdicion(producto, producto?.costo, producto?.costoReposicionBase, producto?.contextoMonetario);
  const { datos: cotizacion, recargar: recargarCotizacion } = useCotizacion();

  const { tipos, loading: loadingClasificacion, getSubtiposPorTipo, getTipoIdDeSubtipo, getTipoNombre, getSubtipoNombre } = useClasificacion();
  const [tipoId, setTipoId] = useState('');
  const [subtipoId, setSubtipoId] = useState('');
  const subtipos = tipoId ? getSubtiposPorTipo(tipoId) : [];
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(undefined);
  const [codigoQr, setCodigoQr] = useState('');

  // Unidades
  const [unidadAlto, setUnidadAlto] = useState<UnidadDimension>('cm');
  const [unidadAncho, setUnidadAncho] = useState<UnidadDimension>('cm');
  const [unidadProfundidad, setUnidadProfundidad] = useState<UnidadDimension>('cm');
  const [unidadPeso, setUnidadPeso] = useState<UnidadPeso>('kg');

  const isEditing = Boolean(producto?.id);
  const formRef = useRef<HTMLFormElement>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef<string | null>(null);
  const [hasChanges, setHasChanges] = useState(!isEditing);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isReadOnlyView = readOnly && !inlineEditing;

  // Copiar al crear: `origen` es el producto copiado; sus datos son los valores
  // iniciales del formulario y hay que cambiar al menos uno para poder guardar.
  const [origen, setOrigen] = useState<Producto | null>(null);
  const [opcionesCopia, setOpcionesCopia] = useState<{ value: string; label: string }[]>([]);
  const [cargandoCopia, setCargandoCopia] = useState(false);
  const [montosOrigen, setMontosOrigen] = useState<{ precio: PrecioEdicion; costo: PrecioEdicion } | null>(null);
  const snapshotCopiaPendiente = useRef(false);
  const base = producto ?? origen ?? undefined;

  const serializeForm = (): string => {
    if (!formRef.current) return '';
    const formData = new FormData(formRef.current);
    const entries = Array.from(formData.entries()).map(([k, v]) => [k, String(v)]);
    entries.push(['imagenUrl', imagenUrl ?? '']);
    entries.push(['subtipoId', subtipoId]);
    entries.push(['codigoQr', codigoQr]);
    entries.push(['unidadAlto', unidadAlto]);
    entries.push(['unidadAncho', unidadAncho]);
    entries.push(['unidadProfundidad', unidadProfundidad]);
    entries.push(['unidadPeso', unidadPeso]);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  };

  const checkForChanges = () => {
    if (!isEditing && !origen) return;
    setHasChanges(serializeForm() !== snapshotRef.current);
  };

  const copiarDe = async (id: string) => {
    if (!id) {
      setOrigen(null);
      setMontosOrigen(null);
      snapshotRef.current = null;
      setPrecio({ moneda: 'ARS', importe: '', contexto: cotizacion, cambiado: false });
      setCosto({ moneda: 'ARS', importe: '', contexto: cotizacion, cambiado: false });
      setTipoId('');
      setSubtipoId('');
      setImagenUrl(undefined);
      setCodigoQr('');
      setUnidadAlto('cm');
      setUnidadAncho('cm');
      setUnidadProfundidad('cm');
      setUnidadPeso('kg');
      setHasChanges(true);
      return;
    }
    setCargandoCopia(true);
    try {
      const copia = await productoClient.obtenerPorId(id);
      if (!copia) throw new Error('No se encontró el producto a copiar.');
      const montos = {
        precio: montoCopiado(copia.precio, copia.precioBase, cotizacion),
        costo: montoCopiado(copia.costo, copia.costoReposicionBase, cotizacion),
      };
      setMontosOrigen(montos);
      setPrecio(montos.precio);
      setCosto(montos.costo);
      snapshotCopiaPendiente.current = true;
      setSubmitError(null);
      setOrigen(copia);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo copiar el producto.');
    } finally {
      setCargandoCopia(false);
    }
  };

  // Opciones para copiar: solo al crear.
  useEffect(() => {
    if (isEditing || readOnly) return;
    productoClient
      .obtenerTodos()
      .then((lista) => setOpcionesCopia(lista.map((p) => ({ value: p.id, label: `${p.codigo ? `[${p.codigo}] ` : ''}${p.nombre}` }))))
      .catch(() => setOpcionesCopia([]));
  }, [isEditing, readOnly]);

  // Copia pedida desde el listado (/productos/nuevo?copiar=<id>).
  useEffect(() => {
    if (copiarDeId && !isEditing) void copiarDe(copiarDeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copiarDeId]);

  // La foto de la copia se toma cuando el formulario ya muestra sus datos.
  useEffect(() => {
    if (!origen || !snapshotCopiaPendiente.current) return;
    if (subtipoId !== (origen.subtipoId ?? '') || codigoQr !== (origen.codigoQr ?? '')) return;
    snapshotRef.current = serializeForm();
    snapshotCopiaPendiente.current = false;
    setHasChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, subtipoId, codigoQr, imagenUrl, unidadAlto, unidadAncho, unidadProfundidad, unidadPeso]);

  const mismoMonto = (a: PrecioEdicion, b: PrecioEdicion) => a.moneda === b.moneda && a.importe.trim() === b.importe.trim();
  const copiaSinCambios = Boolean(
    origen && montosOrigen && !hasChanges &&
    mismoMonto(precio, montosOrigen.precio) && mismoMonto(costo, montosOrigen.costo)
  );

  useEffect(() => {
    if (!isReadOnlyView) codigoInputRef.current?.focus();
  }, [isReadOnlyView]);

  useEffect(() => {
    if (base) {
      setTipoId(getTipoIdDeSubtipo(base.subtipoId) ?? '');
      setSubtipoId(base.subtipoId ?? '');
      setImagenUrl(base.imagenUrl);
      setCodigoQr(base.codigoQr ?? '');
      setUnidadAlto(base.unidadAlto ?? 'cm');
      setUnidadAncho(base.unidadAncho ?? 'cm');
      setUnidadProfundidad(base.unidadProfundidad ?? 'cm');
      setUnidadPeso(base.unidadPesoUnitario ?? 'kg');
    }
  }, [base, getTipoIdDeSubtipo]);

  useEffect(() => {
    if (isEditing && producto) {
      snapshotRef.current = serializeForm();
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto]);

  useEffect(() => {
    if ((isEditing || origen) && snapshotRef.current !== null) {
      checkForChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenUrl, subtipoId, codigoQr, unidadAlto, unidadAncho, unidadProfundidad, unidadPeso]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (copiaSinCambios) {
      setSubmitError(MENSAJE_COPIA_SIN_CAMBIOS);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const body = {
      codigo:                 formData.get('codigo'),
      codigo_barra_proveedor: formData.get('codigoBarraProveedor'),
      nombre:                 formData.get('nombre'),
      marca:                  formData.get('marca'),
      modelo:                 formData.get('modelo'),
      color:                  formData.get('color'),
      presentacion:           formData.get('presentacion'),
      subtipo_id:             subtipoId || null,
      alto:                   parseNum(formData.get('alto')),
      unidad_alto:            unidadAlto,
      ancho:                  parseNum(formData.get('ancho')),
      unidad_ancho:           unidadAncho,
      profundidad:            parseNum(formData.get('profundidad')),
      unidad_profundidad:     unidadProfundidad,
      peso_unitario:          parseNum(formData.get('pesoUnitario')),
      unidad_peso_unitario:   unidadPeso,
      descripcion:            formData.get('descripcion'),
      activo:                 formData.get('activo') === 'true',
      imagen_url:             imagenUrl ?? null,
      descuento_base:         parseNum(formData.get('descuentoBase'), 2),
      codigo_qr:              codigoQr || null,
    };

    try {
      savingRef.current = true;
      setIsSaving(true);
      setSubmitError(null);
      const precioInput = precioParaGuardar(precio, cotizacion);
      const costoInput = costoParaGuardar(costo, cotizacion);
      const payload = {
        ...body,
        ...(precioInput !== undefined ? { precio: precioInput } : {}),
        ...(costoInput !== undefined ? { costo: costoInput } : {}),
      };
      if (isEditing) {
        await productoClient.actualizar(producto!.id, payload);
        if (readOnly) {
          await reload();
          setInlineEditing(false);
        } else {
          router.push(`/productos/${producto!.id}`);
        }
        showSuccess('Producto actualizado correctamente.');
      } else {
        await productoClient.crear(payload);
        router.push('/productos');
        showSuccess('Producto creado correctamente.');
      }
    } catch (err) {
      if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO') await recargarCotizacion();
      if (!(err instanceof CatalogoApiError)) console.error('Error al guardar producto:', err);
      const message = err instanceof Error ? err.message : 'No se pudo guardar el producto. Intenta nuevamente.';
      setSubmitError(message);
      showError(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    if (!producto) return;
    resetPrecio();
    resetCosto();
    setTipoId(getTipoIdDeSubtipo(producto.subtipoId) ?? '');
    setSubtipoId(producto.subtipoId ?? '');
    setImagenUrl(producto.imagenUrl);
    setCodigoQr(producto.codigoQr ?? '');
    setUnidadAlto(producto.unidadAlto ?? 'cm');
    setUnidadAncho(producto.unidadAncho ?? 'cm');
    setUnidadProfundidad(producto.unidadProfundidad ?? 'cm');
    setUnidadPeso(producto.unidadPesoUnitario ?? 'kg');
    setHasChanges(false);
    setSubmitError(null);
    setInlineEditing(false);
  };

  const handleDelete = async () => {
    if (!producto || isDeleting) return;
    try {
      setIsDeleting(true);
      await productoClient.eliminar(producto.id);
      showSuccess('Producto eliminado correctamente.');
      router.push('/productos');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (productoId && isLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>Cargando producto...</p>
        </Card>
      </div>
    );
  }

  if (productoId && (error || !producto)) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>{error ?? 'Producto no encontrado'}</p>
          <Button variant="secondary" onClick={() => router.push('/productos')}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  const tipoOptions = tipos.map((t) => ({ value: t.id, label: t.nombre }));
  const subtipoOptions = subtipos.map((s) => ({ value: s.id, label: s.nombre }));

  if (isReadOnlyView && producto) {
    const text = (value?: string) => value || '—';

    return (
      <div className={`${styles.page} ${styles.pageDetail}`}>
        <button type="button" className={styles.backLink} onClick={() => router.push('/productos')}>
          ← Volver a productos
        </button>

        <div className={styles.pageTitleRow}>
          <h1 className={styles.pageTitle}>{title}</h1>
          <span className={styles.readOnlyChip}>Solo lectura</span>
        </div>

        <Card>
          <div className={styles.form}>
            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Identificación</h2>
              <div className={styles.detailGrid}>
                <DetailField label="Código">{text(producto.codigo)}</DetailField>
                <DetailField label="Código de barra proveedor">{text(producto.codigoBarraProveedor)}</DetailField>
                <DetailField label="Nombre">{text(producto.nombre)}</DetailField>
                <PrecioDetalle
                  label="Precio base global"
                  precio={producto.precio ?? resolverPrecioVista('ARS', producto.precioBase?.toString() ?? null, producto.contextoMonetario ?? null)}
                  contexto={producto.contextoMonetario ?? cotizacion}
                />
                <PrecioDetalle
                  label="Costo de reposición base"
                  precio={producto.costo ?? resolverPrecioVista('ARS', producto.costoReposicionBase?.toString() ?? null, producto.contextoMonetario ?? null)}
                  contexto={producto.contextoMonetario ?? cotizacion}
                  compacto
                />
                <DetailField label="Descuento general">
                  {producto.descuentoBase != null ? `${producto.descuentoBase}%` : '—'}
                </DetailField>
              </div>
            </div>

            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Clasificación</h2>
              <div className={`${styles.detailGrid} ${styles.detailGridWide}`}>
                <DetailField label="Marca">{text(producto.marca)}</DetailField>
                <DetailField label="Modelo">{text(producto.modelo)}</DetailField>
                <DetailField label="Color">{text(producto.color)}</DetailField>
                <DetailField label="Presentación">{text(producto.presentacion)}</DetailField>
                <DetailField label="Tipo">{text(getTipoNombre(getTipoIdDeSubtipo(producto.subtipoId) ?? ''))}</DetailField>
                <DetailField label="Subtipo">{text(getSubtipoNombre(producto.subtipoId))}</DetailField>
              </div>
            </div>

            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Dimensiones y peso</h2>
              <div className={`${styles.detailGrid} ${styles.detailGridWide}`}>
                <DetailField label="Alto">{formatMedida(producto.alto, producto.unidadAlto)}</DetailField>
                <DetailField label="Ancho">{formatMedida(producto.ancho, producto.unidadAncho)}</DetailField>
                <DetailField label="Profundidad">{formatMedida(producto.profundidad, producto.unidadProfundidad)}</DetailField>
                <DetailField label="Peso unitario">{formatMedida(producto.pesoUnitario, producto.unidadPesoUnitario)}</DetailField>
              </div>
            </div>

            <div className={`${styles.section} ${styles.sectionDetail}`}>
              <h2 className={styles.sectionTitle}>Estado y descripción</h2>
              <div className={styles.detailGrid}>
                <DetailField label="Estado">
                  <Badge variant={producto.activo ? 'success' : 'neutral'}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </DetailField>
              </div>
              {producto.descripcion && (
                <DetailField label="Descripción">{producto.descripcion}</DetailField>
              )}
            </div>

            {producto.imagenUrl && (
              <div className={`${styles.section} ${styles.sectionDetail}`}>
                <h2 className={styles.sectionTitle}>Imagen</h2>
                <div className={styles.imageCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={producto.imagenUrl} alt={producto.nombre} className={styles.detailImage} />
                </div>
              </div>
            )}

            {producto.codigoQr && (
              <div className={`${styles.section} ${styles.sectionDetail}`}>
                <h2 className={styles.sectionTitle}>Código QR</h2>
                <div className={styles.qrPreview}>
                  <QRCodeSVG value={producto.codigoQr} size={96} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.actionsDetail}>
            <Button type="button" variant="secondary" onClick={() => router.push('/productos')}>
              Volver
            </Button>
            <Button type="button" onClick={() => setInlineEditing(true)}>
              <Pencil size={15} aria-hidden="true" />
              Editar
            </Button>
            <Button type="button" variant="danger" onClick={() => setShowDeleteConfirmation(true)}>
              <Trash2 size={15} aria-hidden="true" />
              Eliminar
            </Button>
          </div>
        </Card>
        {showDeleteConfirmation && (
          <ConfirmActionModal
            title="Eliminar producto"
            description="Se dará de baja el producto y sus configuraciones de stock. Solo es posible si no tiene stock disponible ni reservado."
            confirmLabel="Eliminar producto"
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
        {!isEditing && (
          <div className={styles.copiarBloque}>
            <Combobox
              label="Copiar datos de un producto existente"
              options={opcionesCopia}
              value={origen?.id ?? ''}
              onChange={(id) => void copiarDe(id)}
              placeholder="Buscar producto a copiar..."
              loading={cargandoCopia}
              disabled={isSaving}
            />
            {origen && (
              <p className={styles.hintDescuento}>
                Se copiaron todos los datos de <b>{origen.nombre}</b>. Cambiá al menos uno antes de guardar.{' '}
                <button type="button" className={styles.linkQuitarCopia} onClick={() => void copiarDe('')} disabled={isSaving}>
                  Empezar en blanco
                </button>
              </p>
            )}
          </div>
        )}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onChange={checkForChanges}
          className={styles.form}
          key={producto?.id ?? (origen ? `copia-${origen.id}` : 'nuevo')}
        >
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Identificación</h2>
            <div className={styles.grid}>
              <Input
                ref={codigoInputRef}
                label={<>Código<span className={styles.requiredMark}>*</span></>}
                name="codigo"
                defaultValue={base?.codigo}
                placeholder="Ej: CAM-001"
                required
                tabIndex={1}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Código de barra proveedor"
                name="codigoBarraProveedor"
                defaultValue={base?.codigoBarraProveedor}
                placeholder="Ej: 7791234560011"
                tabIndex={2}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label={<>Nombre<span className={styles.requiredMark}>*</span></>}
                name="nombre"
                defaultValue={base?.nombre}
                placeholder="Ej: Cámara domo 4MP"
                required
                tabIndex={3}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <PrecioEditor
                value={precio}
                onChange={setPrecio}
                original={producto?.precio}
                label="Precio base global"
                tabIndex={3}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Descuento general (%)"
                name="descuentoBase"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={base?.descuentoBase ?? undefined}
                placeholder="—"
                tabIndex={4}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <PrecioEditor
                value={costo}
                onChange={setCosto}
                tipo="costo"
                label="Costo de reposición base"
                tabIndex={4}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
            </div>
            <p className={styles.hintDescuento}>
              El descuento general aplica a todas las sucursales. Se puede cambiar por sucursal
              desde Stock.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Clasificación</h2>
            <div className={`${styles.grid} ${styles.gridWide}`}>
              <Input
                label="Marca"
                name="marca"
                defaultValue={base?.marca}
                placeholder="Ej: Hikvision"
                tabIndex={5}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Modelo"
                name="modelo"
                defaultValue={base?.modelo}
                placeholder="Ej: DS-2CE56"
                tabIndex={6}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Color"
                name="color"
                defaultValue={base?.color}
                placeholder="Ej: Blanco"
                tabIndex={7}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Presentación"
                name="presentacion"
                defaultValue={base?.presentacion}
                placeholder="Ej: Unidad, Kit, Caja x10"
                tabIndex={8}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Combobox
                label="Tipo"
                options={tipoOptions}
                value={tipoId}
                onChange={(val) => {
                  setTipoId(val);
                  setSubtipoId('');
                  checkForChanges();
                }}
                placeholder="Seleccionar tipo"
                loading={loadingClasificacion}
                tabIndex={9}
              />
              <Combobox
                label="Subtipo"
                options={subtipoOptions}
                value={subtipoId}
                onChange={(val) => {
                  setSubtipoId(val);
                  checkForChanges();
                }}
                placeholder={tipoId ? 'Seleccionar subtipo' : 'Elegí un tipo primero'}
                disabled={!tipoId}
                loading={loadingClasificacion}
                tabIndex={10}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Dimensiones y peso</h2>
            <div className={styles.gridDimensiones}>
              <div className={styles.inputWithUnit}>
                <Input
                  label="Alto"
                  name="alto"
                  type="number"
                  step="0.01"
                  defaultValue={base?.alto ? Number(base.alto).toFixed(2) : undefined}
                  placeholder="Ej: 9.50"
                  tabIndex={11}
                  onKeyDown={(e) => handleEnterAdvance(e, formRef)}
                />
                <Select
                  label="Unidad"
                  value={unidadAlto}
                  onChange={(e) => setUnidadAlto(e.target.value as UnidadDimension)}
                  tabIndex={12}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </Select>
              </div>
              <div className={styles.inputWithUnit}>
                <Input
                  label="Ancho"
                  name="ancho"
                  type="number"
                  step="0.01"
                  defaultValue={base?.ancho ? Number(base.ancho).toFixed(2) : undefined}
                  placeholder="Ej: 9.50"
                  tabIndex={13}
                  onKeyDown={(e) => handleEnterAdvance(e, formRef)}
                />
                <Select
                  label="Unidad"
                  value={unidadAncho}
                  onChange={(e) => setUnidadAncho(e.target.value as UnidadDimension)}
                  tabIndex={14}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </Select>
              </div>
              <div className={styles.inputWithUnit}>
                <Input
                  label="Profundidad"
                  name="profundidad"
                  type="number"
                  step="0.01"
                  defaultValue={base?.profundidad ? Number(base.profundidad).toFixed(2) : undefined}
                  placeholder="Ej: 7.20"
                  tabIndex={15}
                  onKeyDown={(e) => handleEnterAdvance(e, formRef)}
                />
                <Select
                  label="Unidad"
                  value={unidadProfundidad}
                  onChange={(e) => setUnidadProfundidad(e.target.value as UnidadDimension)}
                  tabIndex={16}
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </Select>
              </div>
              <div className={styles.inputWithUnit}>
                <Input
                  label="Peso unitario"
                  name="pesoUnitario"
                  type="number"
                  step="0.01"
                  defaultValue={base?.pesoUnitario ? Number(base.pesoUnitario).toFixed(2) : undefined}
                  placeholder="Ej: 0.45"
                  tabIndex={17}
                  onKeyDown={(e) => handleEnterAdvance(e, formRef)}
                />
                <Select
                  label="Unidad"
                  value={unidadPeso}
                  onChange={(e) => setUnidadPeso(e.target.value as UnidadPeso)}
                  tabIndex={18}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Estado y descripción</h2>
            <div className={styles.grid}>
              <Select label="Estado" name="activo" defaultValue={base ? String(base.activo) : 'true'} tabIndex={19}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </Select>
            </div>
            <div className={styles.descriptionField}>
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                defaultValue={base?.descripcion}
                placeholder="Descripción del producto"
                rows={3}
                tabIndex={20}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Imagen</h2>
            <div className={styles.imageCard}>
              <ImageUploader
                label=""
                initialImageUrl={imagenUrl}
                productoId={producto?.id}
                onUpload={(url) => setImagenUrl(url)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Código QR</h2>
            <div className={styles.qrRow}>
              <Input
                label="Código QR"
                value={codigoQr}
                onChange={(e) => setCodigoQr(e.target.value)}
                placeholder="Ej: CAM-001 o una URL"
                tabIndex={17}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              {codigoQr && (
                <div className={styles.qrPreview}>
                  <QRCodeSVG value={codigoQr} size={96} />
                </div>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={readOnly ? cancelInlineEdit : () => router.push('/productos')}
              disabled={isSaving}
              tabIndex={22}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving || copiaSinCambios || (isEditing && !hasChanges && !precio.cambiado && !costo.cambiado)} tabIndex={21}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
          {copiaSinCambios && <p className={styles.hintDescuento}>{MENSAJE_COPIA_SIN_CAMBIOS}</p>}
          {submitError && <p className={styles.validationError} role="alert">{submitError}</p>}
        </form>
      </Card>
    </div>
  );
}
