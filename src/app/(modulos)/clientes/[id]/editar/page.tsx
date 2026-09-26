import ClienteForm from '../../_components/ClienteForm';

interface EditarClientePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  const { id } = await params;

  return <ClienteForm title="Editar cliente" clienteId={id} />;
}
