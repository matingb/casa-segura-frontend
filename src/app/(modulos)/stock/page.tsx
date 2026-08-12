import StockCatalogo from './_components/StockCatalogo/StockCatalogo';
import styles from './stock.module.css';

export default function StockPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Stock</h1>
      <StockCatalogo />
    </div>
  );
}
