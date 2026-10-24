'use client';

import { ReactNode, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../Sidebar/Sidebar';
import UserMenu from '../UserMenu/UserMenu';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingSpinner} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={styles.contentArea}>
        <header className={styles.topbar}>
          <UserMenu />
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
