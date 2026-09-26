import ClienteForm from '../_components/ClienteForm';

interface DetalleClientePageProps {
  params: Promise<{ id: string }>;
}

export default async function DetalleClientePage({ params }: DetalleClientePageProps) {
  const { id } = await params;

  return <ClienteForm title="Detalle del cliente" clienteId={id} readOnly />;
}
