import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CuentaFinancieraForm from '../../_components/CuentaFinancieraForm/CuentaFinancieraForm';
import { apiUrl } from '../../../../../lib/api';
import { mapApiToCuentaFinanciera } from '../../../../../lib/api/cuenta-financiera.client';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';

interface EditarCuentaPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Editar cuenta financiera | CasaSegura',
};

export default async function EditarCuentaFinancieraPage({
  params,
}: EditarCuentaPageProps) {
  const { id } = await params;

  let cuenta: CuentaFinanciera | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token');
    const cookieString = token ? `access_token=${token.value}` : '';

    const res = await fetch(apiUrl(`/api/cuentas-financieras/${id}`), {
      cache: 'no-store',
      headers: { Cookie: cookieString },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        cuenta = mapApiToCuentaFinanciera(json.data);
      }
    }
  } catch (err) {
    console.error('[EditarCuentaFinancieraPage] Error cargando cuenta:', err);
  }

  if (!cuenta) {
    notFound();
  }

  return <CuentaFinancieraForm title="Editar cuenta financiera" cuenta={cuenta} />;
}
