import ListaPreciosCatalogo from './_components/ListaPreciosCatalogo/ListaPreciosCatalogo';
import styles from './lista-precios.module.css';

export default function ListaPreciosPage() {
  return (
    <div className={styles.page}>
      <ListaPreciosCatalogo />
    </div>
  );
}
