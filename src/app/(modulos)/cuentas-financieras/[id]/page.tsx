import CuentaDetalle from '../_components/CuentaDetalle/CuentaDetalle';

interface CuentaDetallePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Detalle de cuenta financiera | CasaSegura',
  description: 'Historial de movimientos y detalle de la cuenta financiera.',
};

export default async function CuentaDetallePage({ params }: CuentaDetallePageProps) {
  const { id } = await params;
  return <CuentaDetalle cuentaId={id} />;
}
