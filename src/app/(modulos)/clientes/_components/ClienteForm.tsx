'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileDown, Pencil, User, Percent, Building2, MapPin, ArrowLeft } from 'lucide-react';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import Combobox from '../../../../components/ui/Combobox/Combobox';
import Badge from '../../../../components/ui/Badge/Badge';
import DetailField from '../../../../components/ui/DetailField/DetailField';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import {
  Cliente,
  TipoCliente,
  TIPOS_CLIENTE,
  TIPOS_DOCUMENTO,
  CONDICIONES_IVA,
  tipoClienteLabel,
} from '../../../../lib/types/Cliente';
import { clienteClient } from '../../../../lib/api/cliente.client';
import { useClienteDetalle } from '../_hooks/useClienteDetalle';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import { formatPorcentaje, parseNum } from '../../../../lib/utils/formatters';
import ClienteDescuentos from './ClienteDescuentos/ClienteDescuentos';
import ClienteListaPreciosModal from './ClienteListaPreciosModal/ClienteListaPreciosModal';
import styles from './ClienteForm.module.css';

interface ClienteFormProps {
  title: string;
  cliente?: Cliente;
  clienteId?: string;
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

export default function ClienteForm({ title, cliente: clienteProp, clienteId, readOnly = false }: ClienteFormProps) {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { cliente: clienteCargado, isLoading, error, reload } = useClienteDetalle(clienteId ?? '');
  const cliente = clienteId ? clienteCargado ?? undefined : clienteProp;

  const { sucursales, isLoading: loadingSucursales } = useSucursales();
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [condicionIva, setCondicionIva] = useState('');
  const [sucursalIds, setSucursalIds] = useState<string[]>([]);

  const agregarSucursal = (id: string) => {
    setSucursalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const quitarSucursal = (id: string) => {
    setSucursalIds((prev) => prev.filter((s) => s !== id));
  };

  // Los chips respetan el orden en que se fueron agregando.
  const sucursalesSeleccionadas = sucursalIds
    .map((id) => sucursales.find((s) => s.id === id))
    .filter((s): s is (typeof sucursales)[number] => Boolean(s));

  // El desplegable solo ofrece lo que todavía no está elegido.
  const sucursalesDisponibles = sucursales
    .filter((s) => !sucursalIds.includes(s.id))
    .map((s) => ({ value: s.id, label: s.nombre }));

  const isEditing = Boolean(cliente?.id);
  const formRef = useRef<HTMLFormElement>(null);
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef<string | null>(null);
  const [hasChanges, setHasChanges] = useState(!isEditing);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showListaPreciosModal, setShowListaPreciosModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'descuentos'>('info');
  const [totalDescuentos, setTotalDescuentos] = useState<number>(0);
  const isDetailView = Boolean(readOnly && cliente);

  const serializeForm = (): string => {
    if (!formRef.current) return '';
    const formData = new FormData(formRef.current);
    const entries = Array.from(formData.entries()).map(([k, v]) => [k, String(v)]);
    entries.push(['tipoCliente', tipoCliente]);
    entries.push(['tipoDocumento', tipoDocumento]);
    entries.push(['condicionIva', condicionIva]);
    entries.push(['sucursalIds', [...sucursalIds].sort().join(',')]);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  };

  const checkForChanges = () => {
    if (!isEditing) return;
    setHasChanges(serializeForm() !== snapshotRef.current);
  };

  useEffect(() => {
    if (!readOnly || inlineEditing) nombreInputRef.current?.focus();
  }, [readOnly, inlineEditing]);

  useEffect(() => {
    if (cliente) {
      setTipoCliente(cliente.tipoCliente ?? 'persona');
      setTipoDocumento(cliente.tipoDocumento ?? '');
      setCondicionIva(cliente.condicionIva ?? '');
      setSucursalIds((cliente.sucursales ?? []).map((s) => s.id));
    }
  }, [cliente]);

  useEffect(() => {
    if (isEditing && cliente) {
      snapshotRef.current = serializeForm();
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  useEffect(() => {
    if (isEditing && snapshotRef.current !== null) {
      checkForChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCliente, tipoDocumento, condicionIva, sucursalIds]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingRef.current) return;

    const formData = new FormData(e.currentTarget);
    const texto = (campo: string) => {
      const value = formData.get(campo);
      const trimmed = typeof value === 'string' ? value.trim() : '';
      return trimmed || null;
    };

    const nombre = texto('nombre');
    if (!nombre) {
      const message = 'El nombre del cliente es obligatorio.';
      setSubmitError(message);
      showError(message);
      return;
    }

    if (sucursalIds.length === 0) {
      const message = 'Seleccioná al menos una sucursal para el cliente.';
      setSubmitError(message);
      showError(message);
      return;
    }

    const body = {
      nombre,
      tipo_cliente:         tipoCliente,
      razon_social:         texto('razonSocial'),
      nombre_contacto:      texto('nombreContacto'),
      sucursal_ids:         sucursalIds,
      tipo_documento:       tipoDocumento || null,
      nro_documento:        texto('nroDocumento'),
      condicion_iva:        condicionIva.trim() || null,
      email:                texto('email'),
      telefono:             texto('telefono'),
      direccion:            texto('direccion'),
      localidad:            texto('localidad'),
      provincia:            texto('provincia'),
      codigo_postal:        texto('codigoPostal'),
      descuento_porcentaje: parseNum(formData.get('descuentoPorcentaje'), 2),
      observaciones:        texto('observaciones'),
      activo:               formData.get('activo') === 'true',
    };

    try {
      savingRef.current = true;
      setIsSaving(true);
      setSubmitError(null);
      if (isEditing) {
        await clienteClient.actualizar(cliente!.id, body);
        if (readOnly) {
          await reload();
          setInlineEditing(false);
        } else {
          router.push(`/clientes/${cliente!.id}`);
        }
        showSuccess('Cliente actualizado correctamente.');
      } else {
        await clienteClient.crear(body);
        router.push('/clientes');
        showSuccess('Cliente creado correctamente.');
      }
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      const message = err instanceof Error ? err.message : 'No se pudo guardar el cliente. Intenta nuevamente.';
      setSubmitError(message);
      showError(message);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    if (!cliente) return;
    setTipoCliente(cliente.tipoCliente ?? 'persona');
    setTipoDocumento(cliente.tipoDocumento ?? '');
    setCondicionIva(cliente.condicionIva ?? '');
    setSucursalIds((cliente.sucursales ?? []).map((s) => s.id));
    setHasChanges(false);
    setSubmitError(null);
    setInlineEditing(false);
  };

  const handleDelete = async () => {
    if (!cliente || isDeleting) return;
    try {
      setIsDeleting(true);
      await clienteClient.eliminar(cliente.id);
      showSuccess('Cliente dado de baja correctamente.');
      router.push('/clientes');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo dar de baja el cliente.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (clienteId && isLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>Cargando cliente...</p>
        </Card>
      </div>
    );
  }

  if (clienteId && (error || !cliente)) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>{error ?? 'Cliente no encontrado'}</p>
          <Button variant="secondary" onClick={() => router.push('/clientes')}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  // `condicion_iva` es texto libre en la base: si el cliente ya tiene una condición
  // que no está entre las habituales, se agrega como opción para no perderla al editar.
  const condicionIvaOptions = [
    { value: '', label: 'Sin especificar' },
    ...CONDICIONES_IVA.map((c) => ({ value: c, label: c })),
    ...(condicionIva && !CONDICIONES_IVA.includes(condicionIva)
      ? [{ value: condicionIva, label: condicionIva }]
      : []),
  ];

  const renderFormContent = (isInline: boolean) => (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onChange={checkForChanges}
      className={styles.form}
      key={cliente?.id ?? 'nuevo'}
    >
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Sucursales<span className={styles.requiredMark}>*</span>
        </h2>
        <div className={styles.sucursalesPicker}>
          <Combobox
            label="Agregar sucursal"
            options={sucursalesDisponibles}
            value=""
            onChange={(val) => {
              if (val) agregarSucursal(val);
            }}
            placeholder={
              sucursales.length > 0 && sucursalesDisponibles.length === 0
                ? 'Todas las sucursales agregadas'
                : 'Seleccionar sucursal'
            }
            disabled={sucursalesDisponibles.length === 0}
            loading={loadingSucursales}
            tabIndex={1}
          />

          {sucursalesSeleccionadas.length > 0 && (
            <div className={styles.chips}>
              {sucursalesSeleccionadas.map((s) => (
                <span key={s.id} className={styles.chip}>
                  {s.nombre}
                  <button
                    type="button"
                    aria-label={`Quitar ${s.nombre}`}
                    onClick={() => quitarSucursal(s.id)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Identificación</h2>
        <div className={styles.grid}>
          <Input
            ref={nombreInputRef}
            label={<>Nombre<span className={styles.requiredMark}>*</span></>}
            name="nombre"
            defaultValue={cliente?.nombre}
            placeholder="Ej: Juan Pérez"
            required
            tabIndex={1}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Combobox
            label="Tipo de cliente"
            options={TIPOS_CLIENTE}
            value={tipoCliente}
            onChange={(val) => {
              setTipoCliente(val as TipoCliente);
              checkForChanges();
            }}
            placeholder="Seleccionar tipo"
            tabIndex={2}
          />
          <Input
            label="Razón social"
            name="razonSocial"
            defaultValue={cliente?.razonSocial}
            placeholder="Ej: Seguridad Total SRL"
            tabIndex={3}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Input
            label="Nombre de contacto"
            name="nombreContacto"
            defaultValue={cliente?.nombreContacto}
            placeholder="Ej: María González"
            tabIndex={4}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Datos fiscales</h2>
        <div className={`${styles.grid} ${styles.gridWide}`}>
          <Combobox
            label="Tipo de documento"
            options={[
              { value: '', label: 'Sin especificar' },
              ...TIPOS_DOCUMENTO.map((t) => ({ value: t, label: t })),
            ]}
            value={tipoDocumento}
            onChange={(val) => {
              setTipoDocumento(val);
              checkForChanges();
            }}
            placeholder="Sin especificar"
            tabIndex={6}
          />
          <Input
            label="N° de documento"
            name="nroDocumento"
            defaultValue={cliente?.nroDocumento}
            placeholder="Ej: 30123456"
            tabIndex={7}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Combobox
            label="Condición IVA"
            options={condicionIvaOptions}
            value={condicionIva}
            onChange={(val) => {
              setCondicionIva(val);
              checkForChanges();
            }}
            placeholder="Seleccionar condición"
            tabIndex={8}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Contacto</h2>
        <div className={styles.grid}>
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={cliente?.email}
            placeholder="Ej: cliente@empresa.com"
            tabIndex={9}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Input
            label="Teléfono"
            name="telefono"
            defaultValue={cliente?.telefono}
            placeholder="Ej: 11 5566-7788"
            tabIndex={10}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Domicilio</h2>
        <div className={`${styles.grid} ${styles.gridWide}`}>
          <Input
            label="Dirección"
            name="direccion"
            defaultValue={cliente?.direccion}
            placeholder="Ej: Av. Siempreviva 742"
            tabIndex={11}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Input
            label="Localidad"
            name="localidad"
            defaultValue={cliente?.localidad}
            placeholder="Ej: La Plata"
            tabIndex={12}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Input
            label="Provincia"
            name="provincia"
            defaultValue={cliente?.provincia}
            placeholder="Ej: Buenos Aires"
            tabIndex={13}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Input
            label="Código postal"
            name="codigoPostal"
            defaultValue={cliente?.codigoPostal}
            placeholder="Ej: 1900"
            tabIndex={14}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Comercial y estado</h2>
        <div className={styles.grid}>
          <Input
            label="Descuento habitual (%)"
            name="descuentoPorcentaje"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={cliente?.descuentoPorcentaje ?? undefined}
            placeholder="Ej: 10"
            tabIndex={15}
            onKeyDown={(e) => handleEnterAdvance(e, formRef)}
          />
          <Select label="Estado" name="activo" defaultValue={cliente ? String(cliente.activo) : 'true'} tabIndex={16}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select>
        </div>
        <div className={styles.descriptionField}>
          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            id="observaciones"
            name="observaciones"
            defaultValue={cliente?.observaciones}
            placeholder="Notas internas sobre el cliente"
            rows={3}
            tabIndex={17}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={isInline ? cancelInlineEdit : () => router.push('/clientes')}
          disabled={isSaving}
          tabIndex={19}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSaving || (isEditing && !hasChanges)}
          tabIndex={18}
        >
          {isSaving ? 'Guardando...' : isInline ? 'Guardar cambios' : 'Guardar'}
        </Button>
      </div>
      {submitError && <p className={styles.validationError} role="alert">{submitError}</p>}
    </form>
  );

  if (isDetailView && cliente) {
    const text = (value?: string) => value || '—';

    return (
      <div className={`${styles.page} ${styles.pageDetail}`}>
        <button type="button" className={styles.backLink} onClick={() => router.push('/clientes')}>
          <ArrowLeft size={16} />
          <span>Volver a clientes</span>
        </button>

        {/* Hero Header del Cliente */}
        <div className={styles.heroCard}>
          <div className={styles.heroMain}>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroTitle}>{cliente.nombre}</h1>
              <Badge variant={cliente.activo ? 'success' : 'neutral'}>
                {cliente.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              <Badge variant="neutral">
                {tipoClienteLabel(cliente.tipoCliente)}
              </Badge>
            </div>

            <div className={styles.heroMetaRow}>
              {cliente.razonSocial && cliente.razonSocial !== cliente.nombre && (
                <span className={styles.heroMetaItem}>
                  <span className={styles.heroMetaLabel}>Razón Social:</span> {cliente.razonSocial}
                </span>
              )}
              {cliente.nroDocumento && (
                <span className={styles.heroMetaItem}>
                  <span className={styles.heroMetaLabel}>{cliente.tipoDocumento || 'Documento'}:</span>{' '}
                  {cliente.nroDocumento}
                </span>
              )}
              {cliente.descuentoPorcentaje != null && cliente.descuentoPorcentaje > 0 && (
                <span className={styles.heroDiscountBadge}>
                  Desc. habitual: <strong>{formatPorcentaje(cliente.descuentoPorcentaje)}</strong>
                </span>
              )}
              {cliente.sucursales.length > 0 && (
                <span className={styles.heroMetaItem}>
                  <span className={styles.heroMetaLabel}>Sucursales:</span>{' '}
                  {cliente.sucursales.map((s) => s.nombre).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className={styles.heroActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowListaPreciosModal(true)}
              title="Generar lista de precios personalizada en PDF o Excel"
            >
              <FileDown size={16} style={{ marginRight: '0.4rem' }} />
              Lista de precios
            </Button>
            {cliente.activo && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirmation(true)}
              >
                Dar de baja
              </Button>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className={styles.mainTabsBar} role="tablist" aria-label="Secciones del cliente">
          <button
            type="button"
            className={`${styles.mainTabBtn} ${activeTab === 'info' ? styles.mainTabBtnActive : ''}`}
            onClick={() => setActiveTab('info')}
            role="tab"
            aria-selected={activeTab === 'info'}
            id="tab-info"
          >
            <User size={16} />
            <span>Información del Cliente</span>
          </button>

          <button
            type="button"
            className={`${styles.mainTabBtn} ${activeTab === 'descuentos' ? styles.mainTabBtnActive : ''}`}
            onClick={() => setActiveTab('descuentos')}
            role="tab"
            aria-selected={activeTab === 'descuentos'}
            id="tab-descuentos"
          >
            <Percent size={16} />
            <span>Descuentos en Cadena</span>
            <span className={`${styles.tabBadge} ${totalDescuentos > 0 ? styles.tabBadgeHighlight : ''}`}>
              {totalDescuentos}
            </span>
          </button>
        </nav>

        {/* Tab 1: Información del Cliente */}
        {activeTab === 'info' && (
          <div className={styles.tabContentFade} role="tabpanel" aria-labelledby="tab-info">
            {inlineEditing ? (
              <div className={styles.editSectionCard}>
                <div className={styles.editSectionHeader}>
                  <div>
                    <h2 className={styles.tabSectionTitle}>Editar Información del Cliente</h2>
                    <p className={styles.tabSectionSubtitle}>
                      Modificá los datos generales, fiscales y comerciales de este cliente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelInlineEdit}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
                {renderFormContent(true)}
              </div>
            ) : (
              <>
                <div className={styles.tabHeaderActionRow}>
                  <div>
                    <h2 className={styles.tabSectionTitle}>Datos del Cliente</h2>
                    <p className={styles.tabSectionSubtitle}>
                      Información societaria, fiscal, canales de contacto y domicilio registrados.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setInlineEditing(true)}
                  >
                    <Pencil size={15} style={{ marginRight: '0.4rem' }} />
                    Editar información
                  </Button>
                </div>

                <div className={styles.infoCardsGrid}>
                  {/* Tarjeta 1: Identificación y Fiscal */}
                  <div className={styles.categoryCard}>
                    <div className={styles.categoryCardHeader}>
                      <div className={styles.categoryCardIcon}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h2 className={styles.categoryCardTitle}>Identificación y Fiscal</h2>
                        <p className={styles.categoryCardSubtitle}>Datos societarios y tributarios</p>
                      </div>
                    </div>

                    <div className={styles.detailGrid2Col}>
                      <DetailField label="Nombre comercial">{text(cliente.nombre)}</DetailField>
                      <DetailField label="Razón social">{text(cliente.razonSocial)}</DetailField>
                      <DetailField label="Tipo de cliente">{tipoClienteLabel(cliente.tipoCliente)}</DetailField>
                      <DetailField label="Condición IVA">{text(cliente.condicionIva)}</DetailField>
                      <DetailField label="Tipo de documento">{text(cliente.tipoDocumento)}</DetailField>
                      <DetailField label="N° de documento">{text(cliente.nroDocumento)}</DetailField>
                      <DetailField label="Descuento habitual">
                        {cliente.descuentoPorcentaje != null ? formatPorcentaje(cliente.descuentoPorcentaje) : '—'}
                      </DetailField>
                      <DetailField label="Estado">
                        <Badge variant={cliente.activo ? 'success' : 'neutral'}>
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </DetailField>
                    </div>
                  </div>

                  {/* Tarjeta 2: Contacto y Ubicación */}
                  <div className={styles.categoryCard}>
                    <div className={styles.categoryCardHeader}>
                      <div className={styles.categoryCardIcon}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <h2 className={styles.categoryCardTitle}>Contacto y Ubicación</h2>
                        <p className={styles.categoryCardSubtitle}>Canales de comunicación y domicilio</p>
                      </div>
                    </div>

                    <div className={styles.detailGrid2Col}>
                      <DetailField label="Persona de contacto">{text(cliente.nombreContacto)}</DetailField>
                      <DetailField label="Email">{text(cliente.email)}</DetailField>
                      <DetailField label="Teléfono">{text(cliente.telefono)}</DetailField>
                      <DetailField label="Dirección">{text(cliente.direccion)}</DetailField>
                      <DetailField label="Localidad">{text(cliente.localidad)}</DetailField>
                      <DetailField label="Provincia">{text(cliente.provincia)}</DetailField>
                      <DetailField label="Código postal">{text(cliente.codigoPostal)}</DetailField>
                      <DetailField label="Sucursales asignadas">
                        {cliente.sucursales.length > 0 ? (
                          <div className={styles.sucursalChipsList}>
                            {cliente.sucursales.map((s) => (
                              <span key={s.id} className={styles.sucursalChip}>
                                {s.nombre}
                              </span>
                            ))}
                          </div>
                        ) : '—'}
                      </DetailField>
                    </div>
                  </div>
                </div>

                {/* Observaciones si las tiene */}
                {cliente.observaciones && (
                  <div className={styles.observacionesCard}>
                    <h3 className={styles.observacionesTitle}>Observaciones / Notas internas</h3>
                    <p className={styles.observacionesText}>{cliente.observaciones}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Descuentos en Cadena */}
        <div
          style={{ display: activeTab === 'descuentos' ? 'block' : 'none' }}
          role="tabpanel"
          aria-labelledby="tab-descuentos"
        >
          <ClienteDescuentos
            clienteId={cliente.id}
            sucursales={cliente.sucursales}
            descuentoHabitual={cliente.descuentoPorcentaje}
            onTotalDescuentosChange={setTotalDescuentos}
          />
        </div>

        {/* Modales */}
        {showDeleteConfirmation && (
          <ConfirmActionModal
            title="Dar de baja el cliente"
            description="El cliente queda inactivo y deja de aparecer entre los operativos. No se borra: podés reactivarlo editándolo."
            confirmLabel="Dar de baja"
            isConfirming={isDeleting}
            onConfirm={handleDelete}
            onClose={() => setShowDeleteConfirmation(false)}
          />
        )}
        {showListaPreciosModal && (
          <ClienteListaPreciosModal
            isOpen={showListaPreciosModal}
            onClose={() => setShowListaPreciosModal(false)}
            clienteId={cliente.id}
            clienteNombre={cliente.nombre}
            clienteRazonSocial={cliente.razonSocial}
            clienteNroDocumento={cliente.nroDocumento}
            descuentoHabitual={cliente.descuentoPorcentaje}
            sucursales={cliente.sucursales}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        {renderFormContent(false)}
      </Card>
    </div>
  );
}
