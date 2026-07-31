import { notFound } from 'next/navigation';
import ProductoForm from '../../_components/ProductoForm';
import { productosMock } from '../../../../../lib/mocks/productos';

interface EditarProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: EditarProductoPageProps) {
  const { id } = await params;
  const producto = productosMock.find((p) => p.id === id);

  if (!producto) {
    notFound();
  }

  return <ProductoForm title="Editar producto" producto={producto} />;
}
