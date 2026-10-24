'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeft,
  Package,
  Users,
  Warehouse,
  Tag,
  Settings,
  // Fuera del alcance de la próxima release (ocultos del menú, las rutas siguen existiendo):
  // ArrowLeftRight,
  // Landmark,
  // Truck,
} from 'lucide-react';
import { appVersion } from '../../../lib/appVersion';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Fuera del alcance de la próxima release (ocultos del menú, las rutas siguen existiendo):
// { label: 'Operaciones', href: '/operaciones', icon: ArrowLeftRight }
// { label: 'Cuentas financieras', href: '/cuentas-financieras', icon: Landmark }
// { label: 'Pedidos de reposición', href: '/pedidos-reposicion', icon: Truck }
const navItems: NavItem[] = [
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Productos', href: '/productos', icon: Package },
  { label: 'Stock por sucursal', href: '/stock', icon: Warehouse },
  { label: 'Lista de precios', href: '/lista-precios', icon: Tag },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <aside
      className={isOpen ? `${styles.sidebar} ${styles.open}` : styles.sidebar}
      aria-label="Menú principal"
      data-testid="sidebar"
      data-state={isOpen ? 'open' : 'collapsed'}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggle}
          aria-label={isOpen ? 'Colapsar barra lateral' : 'Expandir barra lateral'}
          title={!isOpen ? 'Expandir' : 'Colapsar'}
        >
          <PanelLeft size={22} className={styles.toggleIcon} />
          {!isOpen && (
            <span className={styles.tooltip} role="tooltip">
              Expandir
            </span>
          )}
        </button>

        <div className={styles.divider} aria-hidden="true" />

        <Link
          href="/productos"
          className={styles.brandLink}
          title="CasaSegura"
          aria-label="CasaSegura"
        >
          <span className={styles.brandText}>CasaSegura</span>
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Navegación del ERP">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
              title={!isOpen ? item.label : undefined}
              aria-label={item.label}
            >
              <div className={styles.iconContainer}>
                <Icon size={20} className={styles.navIcon} />
              </div>
              <span className={styles.navLabel}>{item.label}</span>
              {!isOpen && (
                <span className={styles.tooltip} role="tooltip">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottomSection}>
        <Link
          href="/configuracion"
          className={
            pathname === '/configuracion' || pathname?.startsWith('/configuracion/')
              ? `${styles.configLink} ${styles.active}`
              : styles.configLink
          }
          aria-label="Configuración"
          title={!isOpen ? 'Configuración' : undefined}
        >
          <div className={styles.iconContainer}>
            <Settings className={styles.gearIcon} size={20} />
          </div>
          <span className={styles.configLabel}>Configuración</span>
          {!isOpen && (
            <span className={styles.tooltip} role="tooltip">
              Configuración
            </span>
          )}
        </Link>

        <div className={styles.footer}>
          <span>{appVersion}</span>
        </div>
      </div>
    </aside>
  );
}
