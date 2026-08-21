import ProductoForm from '../../_components/ProductoForm';

interface EditarProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: EditarProductoPageProps) {
  const { id } = await params;

  return <ProductoForm title="Editar producto" productoId={id} />;
}
