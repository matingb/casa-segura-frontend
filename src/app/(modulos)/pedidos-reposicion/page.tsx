import PedidosReposicionCatalogo from './_components/PedidosReposicionCatalogo/PedidosReposicionCatalogo';
import styles from './pedidos-reposicion.module.css';

export default function PedidosReposicionPage() {
  return (
    <div className={styles.page}>
      <PedidosReposicionCatalogo />
    </div>
  );
}
