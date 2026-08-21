import ProductosCatalogo from './_components/ProductosCatalogo/ProductosCatalogo';
import styles from './productos.module.css';

export default function ProductosPage() {
  return (
    <div className={styles.page}>
      <ProductosCatalogo />
    </div>
  );
}
