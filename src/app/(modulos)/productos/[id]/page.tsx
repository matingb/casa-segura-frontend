import ProductoForm from '../_components/ProductoForm';

interface DetalleProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function DetalleProductoPage({ params }: DetalleProductoPageProps) {
  const { id } = await params;

  return <ProductoForm title="Detalle del producto" productoId={id} readOnly />;
}
