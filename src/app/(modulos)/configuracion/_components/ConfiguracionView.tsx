'use client';

import { useEffect, useState } from 'react';
import CotizacionConfiguracion from './CotizacionConfiguracion';
import CategoriasConfiguracion from './CategoriasConfiguracion';
import SucursalesConfiguracion from './SucursalesConfiguracion';
import RegionesConfiguracion from './RegionesConfiguracion';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useSucursales } from '../../../../context/SucursalContext';
import styles from '../configuracion.module.css';

type TabType = 'categorias' | 'sucursales' | 'regiones' | 'cotizacion';

export default function ConfiguracionView() {
  const [activeTab, setActiveTab] = useState<TabType>('categorias');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('tab') === 'cotizacion') setActiveTab('cotizacion'); }, []);
  const { tipos } = useClasificacion();
  const { sucursales } = useSucursales();

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>
          Administra las opciones, catálogos y parámetros del sistema.
        </p>
      </header>

      {/* Subpestañas */}
      <nav className={styles.tabsContainer} aria-label="Pestañas de configuración">
        <button type="button" className={`${styles.tabButton} ${activeTab === 'cotizacion' ? styles.active : ''}`} onClick={() => setActiveTab('cotizacion')} role="tab" aria-selected={activeTab === 'cotizacion'} id="tab-cotizacion">Cotización ARS/USD</button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'categorias' ? styles.active : ''}`}
          onClick={() => setActiveTab('categorias')}
          role="tab"
          aria-selected={activeTab === 'categorias'}
          id="tab-categorias"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Categorías</span>
          <span className={styles.tabBadge}>{tipos.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'sucursales' ? styles.active : ''}`}
          onClick={() => setActiveTab('sucursales')}
          role="tab"
          aria-selected={activeTab === 'sucursales'}
          id="tab-sucursales"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M10 21v-6h4v6" />
          </svg>
          <span>Sucursales</span>
          <span className={styles.tabBadge}>{sucursales.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'regiones' ? styles.active : ''}`}
          onClick={() => setActiveTab('regiones')}
          role="tab"
          aria-selected={activeTab === 'regiones'}
          id="tab-regiones"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>Regiones</span>
        </button>
      </nav>

      {/* Contenido de la subpestaña */}
      <main
        className={styles.tabContent}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'categorias' && <CategoriasConfiguracion />}
        {activeTab === 'sucursales' && <SucursalesConfiguracion />}
        {activeTab === 'regiones' && <RegionesConfiguracion />}
        {activeTab === 'cotizacion' && <CotizacionConfiguracion />}
      </main>
    </div>
  );
}
