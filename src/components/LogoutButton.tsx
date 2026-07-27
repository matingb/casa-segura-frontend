'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './LogoutButton.module.css';

export default function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <button onClick={handleLogout} className={styles.logoutButton}>
      Cerrar Sesión
    </button>
  );
}
