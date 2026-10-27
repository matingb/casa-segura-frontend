import ProductoForm from '../_components/ProductoForm';

interface NuevoProductoPageProps {
  searchParams: Promise<{ copiar?: string }>;
}

export default async function NuevoProductoPage({ searchParams }: NuevoProductoPageProps) {
  const { copiar } = await searchParams;

  return <ProductoForm title="Nuevo producto" copiarDeId={copiar} />;
}
