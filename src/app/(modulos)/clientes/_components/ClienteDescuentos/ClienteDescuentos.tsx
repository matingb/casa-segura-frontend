'use client';

import { useCallback, useEffect, useState } from 'react';
import { Percent, MapPin, Tag, Package } from 'lucide-react';
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
  onTotalDescuentosChange?: (count: number) => void;
}

type SubTabLevel = 'region' | 'categoria' | 'producto';

export default function ClienteDescuentos({
  clienteId,
  sucursales,
  descuentoHabitual,
  onTotalDescuentosChange,
}: Props) {
  const { showError } = useToast();
  const [resumen, setResumen] = useState<DescuentosClienteResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<SubTabLevel>('region');

  const cargar = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const data = await clienteDescuentoClient.obtenerDescuentos(clienteId);
      setResumen(data);
      const total =
        (data.regiones?.length ?? 0) +
        (data.categorias?.length ?? 0) +
        (data.productos?.length ?? 0);
      onTotalDescuentosChange?.(total);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cargar descuentos del cliente.');
    } finally {
      setLoading(false);
    }
  }, [clienteId, showError, onTotalDescuentosChange]);

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
              <Percent size={18} />
            </div>
            <div>
              <h3 className={styles.panelTitle}>Descuentos en Cadena</h3>
              <p className={styles.panelSubtitle}>
                Estructura de descuentos de 3 niveles para este cliente
              </p>
            </div>
          </div>

          <div className={styles.chainFlowPill}>
            <span className={styles.flowStep}>1. Región</span>
            <span className={styles.flowArrow}>➔</span>
            <span className={styles.flowStep}>2. Categoría</span>
            <span className={styles.flowArrow}>➔</span>
            <span className={styles.flowStep}>3. Producto</span>
            <span className={styles.flowCompoundNotice}>(Cálculo compuesto en cascada)</span>
          </div>
        </div>

        {/* Subpestañas por Nivel */}
        <nav className={styles.subtabsBar} role="tablist" aria-label="Niveles de descuento">
          <button
            type="button"
            className={`${styles.subtabBtn} ${activeSubTab === 'region' ? styles.subtabBtnActive : ''}`}
            onClick={() => setActiveSubTab('region')}
            role="tab"
            aria-selected={activeSubTab === 'region'}
            id="subtab-region"
          >
            <span className={styles.stepNum}>1</span>
            <MapPin size={14} />
            <span>Regiones por Sucursal</span>
            <span className={`${styles.countBadge} ${totalRegiones > 0 ? styles.countBadgeHighlight : ''}`}>
              {totalRegiones}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.subtabBtn} ${activeSubTab === 'categoria' ? styles.subtabBtnActive : ''}`}
            onClick={() => setActiveSubTab('categoria')}
            role="tab"
            aria-selected={activeSubTab === 'categoria'}
            id="subtab-categoria"
          >
            <span className={styles.stepNum}>2</span>
            <Tag size={14} />
            <span>Categorías / Subcategorías</span>
            <span className={`${styles.countBadge} ${totalCategorias > 0 ? styles.countBadgeHighlight : ''}`}>
              {totalCategorias}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.subtabBtn} ${activeSubTab === 'producto' ? styles.subtabBtnActive : ''}`}
            onClick={() => setActiveSubTab('producto')}
            role="tab"
            aria-selected={activeSubTab === 'producto'}
            id="subtab-producto"
          >
            <span className={styles.stepNum}>3</span>
            <Package size={14} />
            <span>Productos Específicos</span>
            <span className={`${styles.countBadge} ${totalProductos > 0 ? styles.countBadgeHighlight : ''}`}>
              {totalProductos}
            </span>
          </button>
        </nav>

        {/* Contenido de la subpestaña activa */}
        <div className={styles.subtabContent}>
          {activeSubTab === 'region' && (
            <div className={styles.levelPane} role="tabpanel" aria-labelledby="subtab-region">
              <div className={styles.levelDescription}>
                <p>
                  <strong>Primer escalón:</strong> Asigná una región comercial a este cliente por cada punto de venta en el que opera. Este porcentaje base se aplica primero en la cadena comercial.
                </p>
              </div>
              <RegionSelector
                clienteId={clienteId}
                sucursales={sucursales}
                regionesAsignadas={resumenActual.regiones}
                onChanged={cargar}
              />
            </div>
          )}

          {activeSubTab === 'categoria' && (
            <div className={styles.levelPane} role="tabpanel" aria-labelledby="subtab-categoria">
              <div className={styles.levelDescription}>
                <p>
                  <strong>Segundo escalón:</strong> Configurá porcentajes especiales de descuento para categorías completas o subcategorías específicas para este cliente. Se aplica sobre el saldo que deja el descuento de región.
                </p>
              </div>
              <DescuentoCategoriaEditor
                clienteId={clienteId}
                categorias={resumenActual.categorias}
                onChanged={cargar}
              />
            </div>
          )}

          {activeSubTab === 'producto' && (
            <div className={styles.levelPane} role="tabpanel" aria-labelledby="subtab-producto">
              <div className={styles.levelDescription}>
                <p>
                  <strong>Tercer escalón:</strong> Asigná descuentos puntuales para productos específicos (por ejemplo licitaciones o acuerdos de gran volumen). Es el descuento más granular del cliente y se aplica al final de la cadena.
                </p>
              </div>
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
