'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '../../LogoutButton';
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
      <div className={styles.footer}>
        <LogoutButton />
      </div>
    </aside>
  );
}
