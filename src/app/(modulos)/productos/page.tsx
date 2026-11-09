import ProductosCatalogo from './_components/ProductosCatalogo/ProductosCatalogo';
import styles from './productos.module.css';

interface ProductosPageProps {
  searchParams: Promise<{ buscar?: string | string[] }>;
}

export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const { buscar } = await searchParams;
  const busquedaInicial = typeof buscar === 'string' ? buscar : '';

  return (
    <div className={styles.page}>
      <ProductosCatalogo key={busquedaInicial} busquedaInicial={busquedaInicial} />
    </div>
  );
}
