'use client';

import { useCallback, useEffect, useState } from 'react';
import { DescuentosClienteResumen } from '../../../../../lib/types/Region';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { useToast } from '../../../../../context/ToastContext';
import RegionSelector from './RegionSelector';
import DescuentoCategoriaEditor from './DescuentoCategoriaEditor';
import DescuentoProductoEditor from './DescuentoProductoEditor';
import styles from './ClienteDescuentos.module.css';

interface SucursalBasic {
  id: string;
  nombre: string;
}

interface Props {
  clienteId: string;
  sucursales: SucursalBasic[];
  descuentoHabitual?: number | null;
  onGenerarListaPrecios?: () => void;
}

export default function ClienteDescuentos({
  clienteId,
  sucursales,
  descuentoHabitual,
  onGenerarListaPrecios,
}: Props) {
  const { showError } = useToast();
  const [resumen, setResumen] = useState<DescuentosClienteResumen | null>(null);
  const [loading, setLoading] = useState(true);

  // Secciones colapsables abiertas por defecto
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    region: true,
    categoria: true,
    producto: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const data = await clienteDescuentoClient.obtenerDescuentos(clienteId);
      setResumen(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cargar descuentos del cliente.');
    } finally {
      setLoading(false);
    }
  }, [clienteId, showError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading && !resumen) {
    return (
      <div className={styles.container}>
        <div className={styles.panelCard} style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Cargando descuentos del cliente...
          </p>
        </div>
      </div>
    );
  }

  const resumenActual: DescuentosClienteResumen = resumen ?? {
    clienteId,
    descuentoGeneral: descuentoHabitual ?? null,
    regiones: [],
    categorias: [],
    productos: [],
  };

  const totalRegiones = resumenActual.regiones.length;
  const totalCategorias = resumenActual.categorias.length;
  const totalProductos = resumenActual.productos.length;

  return (
    <div className={styles.container}>
      <div className={styles.panelCard}>
        {/* Cabecera general */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <div className={styles.iconBadge}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div>
              <h3 className={styles.panelTitle}>Descuentos en Cadena</h3>
              <p className={styles.panelSubtitle}>
                Estructura de descuentos de 3 niveles para este cliente (Región → Categoría/Subcategoría → Producto)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className={styles.compoundingInfoBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Se aplican de forma compuesta en cascada</span>
            </div>

            {onGenerarListaPrecios && (
              <button
                type="button"
                className={styles.btnHeaderAction}
                onClick={onGenerarListaPrecios}
                title="Generar lista de precios personalizada para este cliente"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Generar lista de precios</span>
              </button>
            )}
          </div>
        </div>

        {/* Nivel 1: Región del Cliente */}
        <div className={styles.sectionBlock}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('region')}
            aria-expanded={openSections.region}
          >
            <div className={styles.sectionTitleRow}>
              <span className={`${styles.sectionStepNumber} ${totalRegiones > 0 ? styles.sectionStepActive : ''}`}>
                1
              </span>
              <span className={styles.sectionTitle}>Nivel 1: Región del Cliente</span>
              <span className={`${styles.countBadge} ${totalRegiones > 0 ? styles.countBadgeHighlight : ''}`}>
                {totalRegiones} {totalRegiones === 1 ? 'región' : 'regiones'}
              </span>
            </div>

            <svg
              className={`${styles.chevronIcon} ${openSections.region ? styles.chevronRotated : ''}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openSections.region && (
            <div className={styles.sectionContent}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                Asigná una región comercial a este cliente por cada punto de venta en el que opera. Este descuento se aplica como primer escalón en la cadena del cliente.
              </p>
              <RegionSelector
                clienteId={clienteId}
                sucursales={sucursales}
                regionesAsignadas={resumenActual.regiones}
                onChanged={cargar}
              />
            </div>
          )}
        </div>

        {/* Nivel 2: Categoría / Subcategoría */}
        <div className={styles.sectionBlock}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('categoria')}
            aria-expanded={openSections.categoria}
          >
            <div className={styles.sectionTitleRow}>
              <span className={`${styles.sectionStepNumber} ${totalCategorias > 0 ? styles.sectionStepActive : ''}`}>
                2
              </span>
              <span className={styles.sectionTitle}>Nivel 2: Categoría / Subcategoría</span>
              <span className={`${styles.countBadge} ${totalCategorias > 0 ? styles.countBadgeHighlight : ''}`}>
                {totalCategorias} {totalCategorias === 1 ? 'asignación' : 'asignaciones'}
              </span>
            </div>

            <svg
              className={`${styles.chevronIcon} ${openSections.categoria ? styles.chevronRotated : ''}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openSections.categoria && (
            <div className={styles.sectionContent}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                Configurá porcentajes especiales de descuento para categorías completas o subcategorías específicas para este cliente. Se aplica sobre el saldo que deja el descuento de región.
              </p>
              <DescuentoCategoriaEditor
                clienteId={clienteId}
                categorias={resumenActual.categorias}
                onChanged={cargar}
              />
            </div>
          )}
        </div>

        {/* Nivel 3: Producto Específico */}
        <div className={styles.sectionBlock}>
          <button
            type="button"
            className={styles.sectionHeader}
            onClick={() => toggleSection('producto')}
            aria-expanded={openSections.producto}
          >
            <div className={styles.sectionTitleRow}>
              <span className={`${styles.sectionStepNumber} ${totalProductos > 0 ? styles.sectionStepActive : ''}`}>
                3
              </span>
              <span className={styles.sectionTitle}>Nivel 3: Producto Específico</span>
              <span className={`${styles.countBadge} ${totalProductos > 0 ? styles.countBadgeHighlight : ''}`}>
                {totalProductos} {totalProductos === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            <svg
              className={`${styles.chevronIcon} ${openSections.producto ? styles.chevronRotated : ''}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {openSections.producto && (
            <div className={styles.sectionContent}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: '1rem' }}>
                Asigná descuentos puntuales para productos específicos (por ejemplo licitaciones o acuerdos de gran volumen). Es el descuento más granular del cliente y se aplica al final de la cadena.
              </p>
              <DescuentoProductoEditor
                clienteId={clienteId}
                productos={resumenActual.productos}
                onChanged={cargar}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
