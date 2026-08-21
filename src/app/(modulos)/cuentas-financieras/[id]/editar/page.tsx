import CuentaFinancieraForm from '../../_components/CuentaFinancieraForm/CuentaFinancieraForm';

interface EditarCuentaPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Editar cuenta financiera | CasaSegura',
};

export default async function EditarCuentaFinancieraPage({ params }: EditarCuentaPageProps) {
  const { id } = await params;

  return <CuentaFinancieraForm title="Editar cuenta financiera" cuentaId={id} />;
}
