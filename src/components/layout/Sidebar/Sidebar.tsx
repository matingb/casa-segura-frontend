'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appVersion } from '../../../lib/appVersion';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Productos', href: '/productos' },
  { label: 'Stock por sucursal', href: '/stock' },
  { label: 'Operaciones', href: '/operaciones' },
  { label: 'Cuentas financieras', href: '/cuentas-financieras' },
  { label: 'Lista de precios', href: '/lista-precios' },
  { label: 'Pedidos de reposición', href: '/pedidos-reposicion' },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export default function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={isOpen ? `${styles.sidebar} ${styles.open}` : styles.sidebar}>
      <div className={styles.brand}>CasaSegura</div>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className={styles.bottomSection}>
        <Link
          href="/configuracion"
          onClick={onNavigate}
          className={
            pathname === '/configuracion' || pathname?.startsWith('/configuracion/')
              ? `${styles.configLink} ${styles.active}`
              : styles.configLink
          }
          aria-label="Configuración"
        >
          <svg
            className={styles.gearIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Configuración</span>
        </Link>
        <div className={styles.footer}>
          <span className={styles.version}>Versión {appVersion}</span>
        </div>
      </div>
    </aside>
  );
}
