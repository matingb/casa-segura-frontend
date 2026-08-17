import { ReactNode } from 'react';
import AppShell from '../../components/layout/AppShell/AppShell';
import { SucursalProvider } from '../../context/SucursalContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SucursalProvider>
      <AppShell>{children}</AppShell>
    </SucursalProvider>
  );
}

