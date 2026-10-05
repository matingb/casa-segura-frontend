import { ReactNode } from 'react';
import AppShell from '../../components/layout/AppShell/AppShell';
import { SucursalProvider } from '../../context/SucursalContext';
import { CotizacionProvider } from '../../context/CotizacionContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SucursalProvider>
      <CotizacionProvider><AppShell>{children}</AppShell></CotizacionProvider>
    </SucursalProvider>
  );
}

