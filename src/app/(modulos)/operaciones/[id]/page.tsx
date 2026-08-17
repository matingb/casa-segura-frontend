import OperacionDetalle from '../_components/OperacionDetalle/OperacionDetalle';

interface OperacionDetallePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Detalle de operación | CasaSegura',
  description: 'Detalle de la operación, desglose de elementos y distribución de cuentas.',
};

export default async function OperacionDetallePage({ params }: OperacionDetallePageProps) {
  const { id } = await params;
  return <OperacionDetalle operacionId={id} />;
}
