'use client';

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
import { Producto } from '../../../../lib/types/Producto';
import { productoClient } from '../../../../lib/api/producto.client';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useProductoDetalle } from '../_hooks/useProductoDetalle';
import { formatARS } from '../../../../lib/utils/formatters';
import styles from './ProductoForm.module.css';

interface ProductoFormProps {
  title: string;
  producto?: Producto;
  productoId?: string;
  readOnly?: boolean;
}

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

export default function ProductoForm({ title, producto: productoProp, productoId, readOnly = false }: ProductoFormProps) {
  const router = useRouter();
  const { producto: productoCargado, isLoading, error } = useProductoDetalle(productoId ?? '');
  const producto = productoId ? productoCargado ?? undefined : productoProp;

  const { tipos, loading: loadingClasificacion, getSubtiposPorTipo, getTipoIdDeSubtipo, getTipoNombre, getSubtipoNombre } = useClasificacion();
  const [tipoId, setTipoId] = useState('');
  const [subtipoId, setSubtipoId] = useState('');
  const subtipos = tipoId ? getSubtiposPorTipo(tipoId) : [];
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(undefined);
  const [codigoQr, setCodigoQr] = useState('');

  const isEditing = Boolean(producto?.id);
  const formRef = useRef<HTMLFormElement>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef<string | null>(null);
  const [hasChanges, setHasChanges] = useState(!isEditing);

  const serializeForm = (): string => {
    if (!formRef.current) return '';
    const formData = new FormData(formRef.current);
    const entries = Array.from(formData.entries()).map(([k, v]) => [k, String(v)]);
    entries.push(['imagenUrl', imagenUrl ?? '']);
    entries.push(['subtipoId', subtipoId]);
    entries.push(['codigoQr', codigoQr]);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  };

  const checkForChanges = () => {
    if (!isEditing) return;
    setHasChanges(serializeForm() !== snapshotRef.current);
  };

  useEffect(() => {
    if (!readOnly) codigoInputRef.current?.focus();
  }, [readOnly]);

  useEffect(() => {
    if (producto) {
      setTipoId(getTipoIdDeSubtipo(producto.subtipoId) ?? '');
      setSubtipoId(producto.subtipoId ?? '');
      setImagenUrl(producto.imagenUrl);
      setCodigoQr(producto.codigoQr ?? '');
    }
  }, [producto, getTipoIdDeSubtipo]);

  useEffect(() => {
    if (isEditing && producto) {
      snapshotRef.current = serializeForm();
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto]);

  useEffect(() => {
    if (isEditing && snapshotRef.current !== null) {
      checkForChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenUrl, subtipoId, codigoQr]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const body = {
      codigo:                formData.get('codigo'),
      codigo_barra_proveedor: formData.get('codigoBarraProveedor'),
      nombre:                formData.get('nombre'),
      marca:                 formData.get('marca'),
      modelo:                formData.get('modelo'),
      color:                 formData.get('color'),
      presentacion:          formData.get('presentacion'),
      subtipo_id:            subtipoId || null,
      alto:                  formData.get('alto') ? Number(formData.get('alto')) : null,
      ancho:                 formData.get('ancho') ? Number(formData.get('ancho')) : null,
      profundidad:           formData.get('profundidad') ? Number(formData.get('profundidad')) : null,
      peso_unitario:         formData.get('pesoUnitario') ? Number(formData.get('pesoUnitario')) : null,
      descripcion:           formData.get('descripcion'),
      activo:                formData.get('activo') === 'true',
      imagen_url:            imagenUrl ?? null,
      precio_base:           formData.get('precioBase') ? Number(formData.get('precioBase')) : null,
      codigo_qr:             codigoQr || null,
    };

    try {
      if (isEditing) {
        await productoClient.actualizar(producto!.id, body);
      } else {
        await productoClient.crear(body);
      }
      router.push('/productos');
    } catch (err) {
      console.error('Error al guardar producto:', err);
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

  if (readOnly && producto) {
    const money = (value?: number) => (value ? formatARS(value) : '—');
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
                <DetailField label="Precio base">{money(producto.precioBase)}</DetailField>
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
                <DetailField label="Alto (cm)">{producto.alto || '—'}</DetailField>
                <DetailField label="Ancho (cm)">{producto.ancho || '—'}</DetailField>
                <DetailField label="Profundidad (cm)">{producto.profundidad || '—'}</DetailField>
                <DetailField label="Peso unitario (kg)">{producto.pesoUnitario || '—'}</DetailField>
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
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onChange={checkForChanges}
          className={styles.form}
          key={producto?.id ?? 'nuevo'}
        >
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Identificación</h2>
            <div className={styles.grid}>
              <Input
                ref={codigoInputRef}
                label={<>Código<span className={styles.requiredMark}>*</span></>}
                name="codigo"
                defaultValue={producto?.codigo}
                placeholder="Ej: CAM-001"
                required
                tabIndex={1}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Código de barra proveedor"
                name="codigoBarraProveedor"
                defaultValue={producto?.codigoBarraProveedor}
                placeholder="Ej: 7791234560011"
                tabIndex={2}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label={<>Nombre<span className={styles.requiredMark}>*</span></>}
                name="nombre"
                defaultValue={producto?.nombre}
                placeholder="Ej: Cámara domo 4MP"
                required
                tabIndex={3}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Precio base ($)"
                name="precioBase"
                type="number"
                step="0.01"
                defaultValue={producto?.precioBase || undefined}
                placeholder="Ej: 15000"
                tabIndex={4}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Clasificación</h2>
            <div className={`${styles.grid} ${styles.gridWide}`}>
              <Input
                label="Marca"
                name="marca"
                defaultValue={producto?.marca}
                placeholder="Ej: Hikvision"
                tabIndex={5}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Modelo"
                name="modelo"
                defaultValue={producto?.modelo}
                placeholder="Ej: DS-2CE56"
                tabIndex={6}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Color"
                name="color"
                defaultValue={producto?.color}
                placeholder="Ej: Blanco"
                tabIndex={7}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Presentación"
                name="presentacion"
                defaultValue={producto?.presentacion}
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
            <div className={`${styles.grid} ${styles.gridWide}`}>
              <Input
                label="Alto (cm)"
                name="alto"
                type="number"
                step="0.1"
                defaultValue={producto?.alto}
                placeholder="Ej: 9.5"
                tabIndex={11}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Ancho (cm)"
                name="ancho"
                type="number"
                step="0.1"
                defaultValue={producto?.ancho}
                placeholder="Ej: 9.5"
                tabIndex={12}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Profundidad (cm)"
                name="profundidad"
                type="number"
                step="0.1"
                defaultValue={producto?.profundidad}
                placeholder="Ej: 7.2"
                tabIndex={13}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
              <Input
                label="Peso unitario (kg)"
                name="pesoUnitario"
                type="number"
                step="0.01"
                defaultValue={producto?.pesoUnitario}
                placeholder="Ej: 0.45"
                tabIndex={14}
                onKeyDown={(e) => handleEnterAdvance(e, formRef)}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Estado y descripción</h2>
            <div className={styles.grid}>
              <Select label="Estado" name="activo" defaultValue={producto ? String(producto.activo) : 'true'} tabIndex={15}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </Select>
            </div>
            <div className={styles.descriptionField}>
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                defaultValue={producto?.descripcion}
                placeholder="Descripción del producto"
                rows={3}
                tabIndex={16}
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
            <Button type="button" variant="secondary" onClick={() => router.push('/productos')} tabIndex={19}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isEditing && !hasChanges} tabIndex={18}>
              Guardar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
