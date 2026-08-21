import StockForm from '../../_components/StockForm';

interface EditarStockPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarStockPage({ params }: EditarStockPageProps) {
  const { id } = await params;

  return <StockForm title="Editar stock" stockItemId={id} />;
}
