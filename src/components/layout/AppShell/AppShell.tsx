'use client';

import { ReactNode, useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={styles.shell}>
      <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className={styles.overlay}
          onClick={closeSidebar}
        />
      )}

      <div className={styles.contentArea}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isSidebarOpen}
            onClick={toggleSidebar}
          >
            <span className={styles.menuIconBar} />
            <span className={styles.menuIconBar} />
            <span className={styles.menuIconBar} />
          </button>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
