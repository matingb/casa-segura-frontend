'use client';

import { useState } from 'react';
import CategoriasConfiguracion from './CategoriasConfiguracion';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import styles from '../configuracion.module.css';

type TabType = 'categorias';

export default function ConfiguracionView() {
  const [activeTab, setActiveTab] = useState<TabType>('categorias');
  const { tipos } = useClasificacion();

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
      </nav>

      {/* Contenido de la subpestaña */}
      <main className={styles.tabContent} role="tabpanel" aria-labelledby="tab-categorias">
        {activeTab === 'categorias' && <CategoriasConfiguracion />}
      </main>
    </div>
  );
}
