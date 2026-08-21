import StockForm from '../_components/StockForm';

interface DetalleStockPageProps {
  params: Promise<{ id: string }>;
}

export default async function DetalleStockPage({ params }: DetalleStockPageProps) {
  const { id } = await params;

  return <StockForm title="Detalle del stock" stockItemId={id} readOnly />;
}
