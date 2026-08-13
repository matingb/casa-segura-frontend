import ListaPreciosCatalogo from './_components/ListaPreciosCatalogo/ListaPreciosCatalogo';
import styles from './lista-precios.module.css';

export default function ListaPreciosPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Lista de Precios</h1>
      <ListaPreciosCatalogo />
    </div>
  );
}
