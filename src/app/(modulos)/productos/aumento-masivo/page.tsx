import AumentoMasivo from './AumentoMasivo';

interface Props {
  searchParams: Promise<{ alcance?: string }>;
}

export default async function AumentoMasivoPage({ searchParams }: Props) {
  const { alcance } = await searchParams;
  return <AumentoMasivo alcanceInicial={alcance === 'stock' ? 'stock' : 'productos'} />;
}
